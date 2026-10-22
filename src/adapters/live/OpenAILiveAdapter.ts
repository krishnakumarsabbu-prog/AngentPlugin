import {
  LivePlatformAdapter,
  LiveExecutionSessionConfig,
  LiveExecutionMessage,
  LiveToolCall,
  LiveToolResult,
  LiveExecutionResult,
} from "./types";
import { sanitizeAuditDetails } from "../../governance/SecuritySanitizer";

export type HttpTransport = (url: string, init: RequestInit) => Promise<Response>;

/**
 * First Approved Live Execution Platform Adapter: OpenAI-Compatible Protocol.
 *
 * Implements direct multi-turn live conversation orchestration, function/tool-calling cycles,
 * token budgeting, timeout controls, and AbortSignal cancellation.
 * Compatible with OpenAI, Azure OpenAI, Ollama, LM Studio, vLLM, and any OpenAI-compatible API gateway.
 */
export class OpenAILiveAdapter implements LivePlatformAdapter {
  public readonly platformId = "openai";
  public readonly platformName = "OpenAI Compatible Live Adapter";
  public readonly defaultEndpoint = "https://api.openai.com/v1";
  public readonly defaultModel = "gpt-4o";

  constructor(private readonly transport: HttpTransport = fetch.bind(globalThis)) {}

  /**
   * Validates session configuration.
   */
  public validateConfiguration(config: LiveExecutionSessionConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.sessionId || typeof config.sessionId !== "string") {
      errors.push("Missing or invalid sessionId.");
    }

    if (!config.model || typeof config.model !== "string") {
      errors.push("Missing or invalid model specification.");
    }

    const endpoint = config.endpointUrl || this.defaultEndpoint;
    if (!/^https?:\/\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+$/.test(endpoint)) {
      errors.push(`Invalid endpoint URL: '${endpoint}'. Must be a valid HTTP/HTTPS URL.`);
    }

    // Require an API key unless targeting local localhost endpoint
    const isLocal = endpoint.includes("localhost") || endpoint.includes("127.0.0.1");
    if (!isLocal && (!config.apiKey || typeof config.apiKey !== "string" || config.apiKey.trim().length === 0)) {
      errors.push("API key is required for external endpoints in live execution mode.");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Executes a live session with model interactions and safe tool execution loops.
   */
  public async executeSession(
    config: LiveExecutionSessionConfig,
    initialMessages: LiveExecutionMessage[],
    toolExecutor: (call: LiveToolCall) => Promise<LiveToolResult>,
    options?: { signal?: AbortSignal; onChunk?: (chunk: string) => void }
  ): Promise<LiveExecutionResult> {
    const startTime = Date.now();
    const validation = this.validateConfiguration(config);
    if (!validation.valid) {
      return {
        sessionId: config.sessionId,
        status: "failed",
        messages: initialMessages,
        finalResponse: "",
        toolCallsMade: [],
        durationMs: 0,
        error: `Configuration validation failed: ${validation.errors.join("; ")}`,
      };
    }

    const endpoint = (config.endpointUrl || this.defaultEndpoint).replace(/\/+$/, "");
    const chatUrl = `${endpoint}/chat/completions`;
    const maxTurns = config.maxTurns ?? 6;
    const timeoutMs = config.timeoutMs ?? 30000;
    const toolCallsMade: Array<{ call: LiveToolCall; result: LiveToolResult }> = [];

    // Working conversation history
    const conversation: LiveExecutionMessage[] = [...initialMessages];

    // If system prompt is provided and not in history, prepend it
    if (config.systemPrompt && !conversation.some((m) => m.role === "system")) {
      conversation.unshift({
        role: "system",
        content: config.systemPrompt,
        timestamp: new Date().toISOString(),
      });
    }

    // Format tools for OpenAI function calling
    const formattedTools =
      config.tools && config.tools.length > 0
        ? config.tools.map((t) => ({
            type: "function",
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters || { type: "object", properties: {} },
            },
          }))
        : undefined;

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let currentTurn = 0;

    // Multi-turn tool execution loop
    while (currentTurn < maxTurns) {
      currentTurn++;

      // Check external cancellation signal
      if (options?.signal?.aborted) {
        return {
          sessionId: config.sessionId,
          status: "cancelled",
          messages: conversation,
          finalResponse: "Execution cancelled by user.",
          toolCallsMade,
          durationMs: Date.now() - startTime,
          error: "Cancelled by user.",
        };
      }

      // Check overall execution timeout
      if (Date.now() - startTime > timeoutMs) {
        return {
          sessionId: config.sessionId,
          status: "timeout",
          messages: conversation,
          finalResponse: "Execution terminated: Session timeout exceeded.",
          toolCallsMade,
          durationMs: Date.now() - startTime,
          error: `Execution exceeded bounded timeout threshold (${timeoutMs}ms).`,
        };
      }

      // Prepare request payload
      const requestPayload: Record<string, unknown> = {
        model: config.model,
        messages: conversation.map((m) => {
          const item: Record<string, unknown> = {
            role: m.role,
            content: m.content || "",
          };
          if (m.toolCalls && m.toolCalls.length > 0) {
            item.tool_calls = m.toolCalls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments || {}),
              },
            }));
          }
          if (m.toolCallId) {
            item.tool_call_id = m.toolCallId;
          }
          return item;
        }),
        temperature: config.temperature ?? 0.2,
      };

      if (config.maxTokens) {
        requestPayload.max_tokens = config.maxTokens;
      }

      if (formattedTools && formattedTools.length > 0) {
        requestPayload.tools = formattedTools;
        requestPayload.tool_choice = "auto";
      }

      // Setup turn timeout and abort signal
      const turnAbortController = new AbortController();
      const onExternalAbort = () => turnAbortController.abort();
      options?.signal?.addEventListener("abort", onExternalAbort);

      const timeoutId = setTimeout(() => {
        turnAbortController.abort();
      }, Math.max(1000, timeoutMs - (Date.now() - startTime)));

      let response: Response;
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        if (config.apiKey) {
          headers["Authorization"] = `Bearer ${config.apiKey}`;
        }

        response = await this.transport(chatUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(requestPayload),
          signal: turnAbortController.signal,
        });
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        options?.signal?.removeEventListener("abort", onExternalAbort);

        const errorMsg = err instanceof Error ? err.message : String(err);
        const isAbort = turnAbortController.signal.aborted || options?.signal?.aborted;

        return {
          sessionId: config.sessionId,
          status: isAbort ? "cancelled" : "failed",
          messages: conversation,
          finalResponse: "",
          toolCallsMade,
          durationMs: Date.now() - startTime,
          error: sanitizeAuditDetails(isAbort ? "Execution cancelled." : `Network error: ${errorMsg}`) as string,
        };
      } finally {
        clearTimeout(timeoutId);
        options?.signal?.removeEventListener("abort", onExternalAbort);
      }

      if (!response.ok) {
        let errBody = "";
        try {
          errBody = await response.text();
        } catch {
          errBody = response.statusText;
        }
        return {
          sessionId: config.sessionId,
          status: "failed",
          messages: conversation,
          finalResponse: "",
          toolCallsMade,
          durationMs: Date.now() - startTime,
          error: sanitizeAuditDetails(
            `Live API request failed with HTTP ${response.status} (${response.statusText}): ${errBody}`
          ) as string,
        };
      }

      let data: any;
      try {
        data = await response.json();
      } catch (parseErr) {
        return {
          sessionId: config.sessionId,
          status: "failed",
          messages: conversation,
          finalResponse: "",
          toolCallsMade,
          durationMs: Date.now() - startTime,
          error: "Failed to parse model response as JSON.",
        };
      }

      // Accumulate usage
      if (data.usage) {
        totalPromptTokens += data.usage.prompt_tokens || 0;
        totalCompletionTokens += data.usage.completion_tokens || 0;
      }

      const choice = data.choices?.[0];
      if (!choice || !choice.message) {
        return {
          sessionId: config.sessionId,
          status: "failed",
          messages: conversation,
          finalResponse: "",
          toolCallsMade,
          durationMs: Date.now() - startTime,
          error: "Model returned empty choice response.",
        };
      }

      const assistantMsg = choice.message;
      const content = assistantMsg.content || "";
      const rawToolCalls = assistantMsg.tool_calls;

      // Stream content if callback provided
      if (content && options?.onChunk) {
        options.onChunk(content);
      }

      // Check if model returned tool calls
      if (Array.isArray(rawToolCalls) && rawToolCalls.length > 0) {
        const parsedCalls: LiveToolCall[] = [];

        for (const tc of rawToolCalls) {
          let callArgs: Record<string, unknown> = {};
          try {
            callArgs =
              typeof tc.function?.arguments === "string"
                ? JSON.parse(tc.function.arguments)
                : tc.function?.arguments || {};
          } catch {
            callArgs = { raw: tc.function?.arguments };
          }

          parsedCalls.push({
            id: tc.id || `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: tc.function?.name || "unknown",
            arguments: callArgs,
          });
        }

        // Record assistant turn with tool calls
        conversation.push({
          role: "assistant",
          content,
          toolCalls: parsedCalls,
          timestamp: new Date().toISOString(),
        });

        // Execute each tool call securely via toolExecutor
        for (const call of parsedCalls) {
          const result = await toolExecutor(call);
          toolCallsMade.push({ call, result });

          // Append tool result message
          conversation.push({
            role: "tool",
            toolCallId: call.id,
            name: call.name,
            content:
              typeof result.output === "string"
                ? result.output
                : JSON.stringify(result.output ?? { error: result.error }),
            timestamp: new Date().toISOString(),
          });
        }

        // Continue loop to send tool results back to model
        continue;
      }

      // No tool calls: model completed its response
      conversation.push({
        role: "assistant",
        content,
        timestamp: new Date().toISOString(),
      });

      return {
        sessionId: config.sessionId,
        status: "completed",
        messages: conversation,
        finalResponse: content,
        toolCallsMade,
        usage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          totalTokens: totalPromptTokens + totalCompletionTokens,
        },
        durationMs: Date.now() - startTime,
      };
    }

    // Max turns exceeded (bounded execution guarantee)
    const lastAssistant = [...conversation].reverse().find((m) => m.role === "assistant");
    return {
      sessionId: config.sessionId,
      status: "completed",
      messages: conversation,
      finalResponse:
        lastAssistant?.content || "Maximum interaction turns reached. Deliverable finalized.",
      toolCallsMade,
      usage: {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens: totalPromptTokens + totalCompletionTokens,
      },
      durationMs: Date.now() - startTime,
    };
  }
}
