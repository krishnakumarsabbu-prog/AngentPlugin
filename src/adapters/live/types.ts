import { PermissionPolicy } from "../../domain/agents/types";

export interface LiveToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  category?: "filesystem_read" | "filesystem_write" | "network" | "shell" | "computation";
}

export interface LiveToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LiveToolResult {
  toolCallId: string;
  output: unknown;
  error?: string;
  isDenied?: boolean;
}

export interface LiveExecutionMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: LiveToolCall[];
  toolCallId?: string;
  name?: string;
  timestamp?: string;
}

export interface LiveExecutionSessionConfig {
  sessionId: string;
  platformId: string;
  model: string;
  endpointUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  maxTurns?: number;
  timeoutMs?: number;
  systemPrompt?: string;
  agentName?: string;
  permissionPolicy?: Partial<PermissionPolicy>;
  tools?: LiveToolDefinition[];
  workspaceRoot?: string;
}

export interface LiveExecutionResult {
  sessionId: string;
  status: "completed" | "failed" | "cancelled" | "timeout" | "permission_denied";
  messages: LiveExecutionMessage[];
  finalResponse: string;
  toolCallsMade: Array<{ call: LiveToolCall; result: LiveToolResult }>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  durationMs: number;
  error?: string;
}

export interface LivePlatformAdapter {
  readonly platformId: string;
  readonly platformName: string;
  readonly defaultEndpoint: string;
  readonly defaultModel: string;

  /**
   * Validates configuration parameters for a live execution session.
   */
  validateConfiguration(config: LiveExecutionSessionConfig): {
    valid: boolean;
    errors: string[];
  };

  /**
   * Executes a bounded multi-turn session with real model calls and tool execution.
   */
  executeSession(
    config: LiveExecutionSessionConfig,
    messages: LiveExecutionMessage[],
    toolExecutor: (call: LiveToolCall) => Promise<LiveToolResult>,
    options?: { signal?: AbortSignal; onChunk?: (chunk: string) => void }
  ): Promise<LiveExecutionResult>;
}
