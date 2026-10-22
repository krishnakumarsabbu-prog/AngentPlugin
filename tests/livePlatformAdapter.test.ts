import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { SecureCredentialStore, InMemorySecretStorage } from "../src/security/SecureCredentialStore";
import { PermissionEnforcer } from "../src/security/PermissionSandbox";
import { OpenAILiveAdapter, HttpTransport } from "../src/adapters/live/OpenAILiveAdapter";
import { LiveExecutionEngine } from "../src/executions/LiveExecutionEngine";
import { Workflow } from "../src/domain/workflows/types";
import { Agent } from "../src/domain/agents/types";
import { ExecutionRecord } from "../src/domain/executions/types";

describe("Real Platform Adapters, Security Sandboxing & Live Execution", () => {
  let tempDir: string;
  let secretStorage: InMemorySecretStorage;
  let credentialStore: SecureCredentialStore;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "agentforge-live-test-"));
    secretStorage = new InMemorySecretStorage();
    credentialStore = new SecureCredentialStore(secretStorage);
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  describe("1. Secure Credential Handling", () => {
    it("stores, retrieves, and checks credentials securely without plaintext exposure", async () => {
      await credentialStore.setCredential("openai", "sk-proj-1234567890abcdef1234567890");

      const hasKey = await credentialStore.hasCredential("openai");
      expect(hasKey).toBe(true);

      const secret = await credentialStore.getCredential("openai");
      expect(secret).toBe("sk-proj-1234567890abcdef1234567890");

      const status = await credentialStore.getCredentialStatus("openai");
      expect(status.configured).toBe(true);
      expect(status.maskedPreview).toBe("***...7890");
      expect(status.maskedPreview).not.toContain("1234567890abcdef");

      await credentialStore.deleteCredential("openai");
      expect(await credentialStore.hasCredential("openai")).toBe(false);
      expect(await credentialStore.getCredential("openai")).toBeUndefined();
    });

    it("rejects empty, invalid, or whitespace-only credentials", async () => {
      await expect(credentialStore.setCredential("openai", "")).rejects.toThrow("non-empty string");
      await expect(credentialStore.setCredential("openai", "   ")).rejects.toThrow("non-empty string");
    });

    it("scrubs secrets from telemetry, audit records, and serialized context data", () => {
      const payload = {
        apiKey: "sk-proj-live-token-secret-value",
        token: "ghp_123456789012345678901234567890123456",
        config: {
          authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID",
          endpoint: "https://api.openai.com/v1",
        },
      };

      const sanitized = credentialStore.sanitizePayload(payload);
      expect(sanitized.apiKey).toBe("[REDACTED_SECRET]");
      expect(sanitized.token).toBe("[REDACTED_SECRET]");
      expect(sanitized.config.authorization).toBe("[REDACTED_SECRET]");
      expect(sanitized.config.endpoint).toBe("https://api.openai.com/v1");
    });
  });

  describe("2. Permission Enforcement & Sandbox Security Boundaries", () => {
    it("strictly rejects path traversal attacks escaping workspace root", () => {
      const traversalArgs = [{ path: "../../../etc/passwd" }, { path: "..\\..\\secret.key" }, { path: "src/../../outside.txt" }];

      for (const args of traversalArgs) {
        const check = PermissionEnforcer.checkPermission(
          "read_workspace_file",
          args,
          { fileSystem: "read" },
          tempDir
        );
        expect(check.allowed).toBe(false);
        expect(check.reason).toContain("Sandbox violation");
      }
    });

    it("blocks access to sensitive restricted files (.env, .git, *.pem, *.key)", () => {
      const sensitiveFiles = [".env", ".env.local", ".git/config", "certs/server.pem", "id_rsa", "credentials.json"];

      for (const file of sensitiveFiles) {
        const check = PermissionEnforcer.checkPermission(
          "read_workspace_file",
          { path: file },
          { fileSystem: "read", restrictedPaths: [".env", ".git", "*.pem", "*.key"] },
          tempDir
        );
        expect(check.allowed).toBe(false);
        expect(check.reason).toContain("Access denied");
      }
    });

    it("enforces filesystem read-only permissions and rejects write operations", () => {
      const writeCheck = PermissionEnforcer.checkPermission(
        "write_workspace_file",
        { path: "output.txt", content: "data" },
        { fileSystem: "read", readOnly: true },
        tempDir
      );
      expect(writeCheck.allowed).toBe(false);
      expect(writeCheck.reason).toContain("requires filesystem write permissions");

      const allowedWrite = PermissionEnforcer.checkPermission(
        "write_workspace_file",
        { path: "output.txt", content: "data" },
        { fileSystem: "readwrite", readOnly: false },
        tempDir
      );
      expect(allowedWrite.allowed).toBe(true);
    });

    it("denies shell command execution when shell permission is false", () => {
      const check = PermissionEnforcer.checkPermission(
        "execute_command",
        { command: "npm test" },
        { shell: false },
        tempDir
      );
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("requires shell execution permission");
    });

    it("denies outbound network tools when network permission is false", () => {
      const check = PermissionEnforcer.checkPermission(
        "http_fetch",
        { url: "https://api.example.com" },
        { network: false },
        tempDir
      );
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("requires outbound network access");
    });

    it("executes safe workspace tools within boundaries", async () => {
      // 1. Write file
      const writeRes = await PermissionEnforcer.executeSafeTool(
        "write_workspace_file",
        { path: "src/sample.ts", content: "export class Calculator { add(a: number, b: number) { return a + b; } }" },
        tempDir,
        { fileSystem: "readwrite", readOnly: false }
      );
      expect(writeRes.success).toBe(true);

      // 2. Read file
      const readRes = await PermissionEnforcer.executeSafeTool(
        "read_workspace_file",
        { path: "src/sample.ts" },
        tempDir,
        { fileSystem: "read" }
      );
      expect(readRes.success).toBe(true);
      expect((readRes.result as any).content).toContain("export class Calculator");

      // 3. Analyze code structure
      const analyzeRes = await PermissionEnforcer.executeSafeTool(
        "analyze_code_structure",
        { path: "src/sample.ts" },
        tempDir,
        { fileSystem: "read" }
      );
      expect(analyzeRes.success).toBe(true);
      expect((analyzeRes.result as any).classes.some((c: string) => c.includes("Calculator"))).toBe(true);

      // 4. List workspace files
      const listRes = await PermissionEnforcer.executeSafeTool(
        "list_workspace_files",
        { directory: "src" },
        tempDir,
        { fileSystem: "read" }
      );
      expect(listRes.success).toBe(true);
      expect((listRes.result as any).entries.some((e: any) => e.name === "sample.ts")).toBe(true);
    });
  });

  describe("3. OpenAILiveAdapter Live Protocol & Multi-Turn Tool Loops", () => {
    it("validates live session configuration parameters", () => {
      const adapter = new OpenAILiveAdapter();

      const invalid = adapter.validateConfiguration({
        sessionId: "",
        platformId: "openai",
        model: "",
        endpointUrl: "not-a-url",
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.length).toBeGreaterThanOrEqual(3);

      const valid = adapter.validateConfiguration({
        sessionId: "sess-1",
        platformId: "openai",
        model: "gpt-4o",
        endpointUrl: "https://api.openai.com/v1",
        apiKey: "sk-test-key-1234567890",
      });
      expect(valid.valid).toBe(true);
      expect(valid.errors).toHaveLength(0);
    });

    it("executes multi-turn conversation with real tool calling and responses", async () => {
      let turnCounter = 0;
      const mockTransport: HttpTransport = async (url, init) => {
        turnCounter++;
        const body = JSON.parse(init.body as string);

        if (turnCounter === 1) {
          // Model requests tool call
          return new Response(
            JSON.stringify({
              id: "chatcmpl-1",
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: "Let me inspect the workspace source file.",
                    tool_calls: [
                      {
                        id: "call-read-1",
                        type: "function",
                        function: {
                          name: "read_workspace_file",
                          arguments: JSON.stringify({ path: "README.md" }),
                        },
                      },
                    ],
                  },
                },
              ],
              usage: { prompt_tokens: 45, completion_tokens: 25 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } else {
          // Model finishes with final answer after receiving tool response
          const toolMsg = body.messages.find((m: any) => m.role === "tool");
          expect(toolMsg).toBeDefined();
          expect(toolMsg.tool_call_id).toBe("call-read-1");

          return new Response(
            JSON.stringify({
              id: "chatcmpl-2",
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: "The project README specifies AgentForge architecture.",
                  },
                },
              ],
              usage: { prompt_tokens: 80, completion_tokens: 30 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      };

      const adapter = new OpenAILiveAdapter(mockTransport);

      const toolExecutor = async (call: any) => {
        expect(call.name).toBe("read_workspace_file");
        expect(call.arguments.path).toBe("README.md");
        return {
          toolCallId: call.id,
          output: "# AgentForge Platform\nUniversal AI skills and harness pipelines.",
        };
      };

      const result = await adapter.executeSession(
        {
          sessionId: "live-session-1",
          platformId: "openai",
          model: "gpt-4o",
          endpointUrl: "https://api.openai.com/v1",
          apiKey: "sk-test-valid-key",
          maxTurns: 4,
          tools: [
            {
              name: "read_workspace_file",
              description: "Read workspace file",
              parameters: { type: "object", properties: { path: { type: "string" } } },
            },
          ],
        },
        [{ role: "user", content: "Inspect README.md and describe the project." }],
        toolExecutor
      );

      expect(result.status).toBe("completed");
      expect(result.toolCallsMade).toHaveLength(1);
      expect(result.toolCallsMade[0].call.name).toBe("read_workspace_file");
      expect(result.finalResponse).toContain("The project README specifies AgentForge architecture.");
      expect(result.usage?.totalTokens).toBe(180);
      expect(turnCounter).toBe(2);
    });

    it("enforces bounded execution and prevents runaway turn loops", async () => {
      let turns = 0;
      // Mock that continuously attempts to request tools without stopping
      const mockTransport: HttpTransport = async () => {
        turns++;
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  role: "assistant",
                  content: `Calling step ${turns}`,
                  tool_calls: [
                    {
                      id: `call-${turns}`,
                      type: "function",
                      function: { name: "test_tool", arguments: "{}" },
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const adapter = new OpenAILiveAdapter(mockTransport);
      const result = await adapter.executeSession(
        {
          sessionId: "bounded-session",
          platformId: "openai",
          model: "gpt-4o",
          endpointUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          maxTurns: 3, // Bounded at 3
        },
        [{ role: "user", content: "Run forever" }],
        async (call) => ({ toolCallId: call.id, output: "ok" })
      );

      expect(result.status).toBe("completed");
      expect(turns).toBe(3);
      expect(result.finalResponse).toBeDefined();
    });

    it("respects AbortSignal cancellation immediately", async () => {
      const abortCtrl = new AbortController();

      const mockTransport: HttpTransport = async (_url, init) => {
        // Trigger abort mid-flight
        abortCtrl.abort();
        if (init.signal?.aborted) {
          throw new Error("The operation was aborted.");
        }
        return new Response("{}", { status: 200 });
      };

      const adapter = new OpenAILiveAdapter(mockTransport);
      const result = await adapter.executeSession(
        {
          sessionId: "abort-session",
          platformId: "openai",
          model: "gpt-4o",
          endpointUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
        },
        [{ role: "user", content: "Cancellable task" }],
        async (call) => ({ toolCallId: call.id, output: "ok" }),
        { signal: abortCtrl.signal }
      );

      expect(result.status).toBe("cancelled");
      expect(result.error).toContain("cancelled");
    });
  });

  describe("4. End-to-End Workflow Completing Real Work with Security Enforced", () => {
    it("completes live workflow, performs real file analysis, passes context handoffs, and passes security tests", async () => {
      // 1. Setup real file in workspace for real analysis
      const workspaceFile = path.join(tempDir, "PaymentGateway.ts");
      await fs.promises.writeFile(
        workspaceFile,
        `export class PaymentGateway {
  public async processTransaction(amount: number): Promise<boolean> {
    if (amount <= 0) throw new Error("Invalid amount");
    return true;
  }
}`,
        "utf8"
      );

      // 2. Setup mock live model responses for real work
      const mockTransport: HttpTransport = async (_url, init) => {
        const body = JSON.parse(init.body as string);
        const lastMsg = body.messages[body.messages.length - 1];

        if (lastMsg.role === "tool") {
          // Model received the real code analysis tool output
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: "Verified PaymentGateway contains processTransaction with input guard.",
                  },
                },
              ],
              usage: { prompt_tokens: 120, completion_tokens: 40 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // Initial turn: Agent decides to analyze PaymentGateway.ts
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  role: "assistant",
                  content: "I will inspect PaymentGateway.ts structure.",
                  tool_calls: [
                    {
                      id: "call-analyze-1",
                      type: "function",
                      function: {
                        name: "analyze_code_structure",
                        arguments: JSON.stringify({ path: "PaymentGateway.ts" }),
                      },
                    },
                  ],
                },
              },
            ],
            usage: { prompt_tokens: 60, completion_tokens: 30 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const liveAdapter = new OpenAILiveAdapter(mockTransport);

      // In-memory execution storage
      const executionRecords: ExecutionRecord[] = [];
      const storage = {
        saveExecution: async (rec: ExecutionRecord) => {
          const idx = executionRecords.findIndex((r) => r.id === rec.id);
          if (idx >= 0) executionRecords[idx] = { ...rec };
          else executionRecords.push({ ...rec });
          return rec;
        },
        getExecution: async (id: string) => executionRecords.find((r) => r.id === id),
        listExecutions: async () => [...executionRecords],
      };

      // Mock agent provider with least-privilege policy
      const agent: Agent = {
        id: "code-auditor",
        name: "Code Auditor Agent",
        description: "Inspects code files and verifies structure",
        role: "Quality Engineer",
        objective: "Analyze code architecture",
        instructions: "Inspect requested source files using safe tools.",
        permissionPolicy: {
          fileSystem: "read",
          network: false,
          shell: false,
          maxTokens: 4096,
          readOnly: true,
          restrictedPaths: [".env", ".git"],
          humanApprovalRequired: true,
        },
        assignedSkillIds: [],
        compatibility: ["openai"],
        status: "Ready",
        version: "1.0.0",
      };

      const liveEngine = new LiveExecutionEngine({
        storage,
        credentialStore,
        adapter: liveAdapter,
        agentProvider: async () => agent,
        workspaceRoot: tempDir,
      });

      // 3. Define multi-node end-to-end workflow:
      // Start -> Requirement -> Code Auditor Agent (Live) -> Human Approval -> Merge -> End
      const workflow: Workflow = {
        id: "wf-live-e2e-audit",
        name: "Live Architectural Audit Pipeline",
        version: "1.0.0",
        status: "Active",
        nodes: [
          { id: "start", type: "start", name: "Start Trigger", configuration: {}, position: { x: 0, y: 0 } },
          {
            id: "req",
            type: "requirement_input",
            name: "Audit Requirement",
            configuration: { requirement: "Audit PaymentGateway.ts and extract classes" },
            position: { x: 100, y: 0 },
          },
          {
            id: "auditor",
            type: "agent_execution",
            name: "Live Code Auditor",
            configuration: { agentId: "code-auditor", model: "gpt-4o" },
            position: { x: 200, y: 0 },
          },
          {
            id: "approval",
            type: "human_approval",
            name: "Architecture Sign-off",
            configuration: {
              approverRole: "Security Lead",
              whatIsBeingApproved: "Payment Gateway Code Audit",
              approvalMessage: "Approve findings before release",
            },
            position: { x: 300, y: 0 },
          },
          {
            id: "merge",
            type: "merge_results",
            name: "Aggregate Audit",
            configuration: { strategy: "combine_all" },
            position: { x: 400, y: 0 },
          },
          { id: "end", type: "end", name: "End Pipeline", configuration: {}, position: { x: 500, y: 0 } },
        ],
        edges: [
          { id: "e1", source: "start", target: "req" },
          { id: "e2", source: "req", target: "auditor" },
          { id: "e3", source: "auditor", target: "approval" },
          { id: "e4", source: "approval", target: "merge" },
          { id: "e5", source: "merge", target: "end" },
        ],
        executionSettings: { maxParallelNodes: 1, retryPolicy: { maxRetries: 0, backoffSeconds: 0 }, requireApprovalFor: [] },
        createdAt: "2026-10-19T10:00:00Z",
        updatedAt: "2026-10-19T10:00:00Z",
      };

      // 4. Start execution: pauses at Human Approval gate
      const pausedRun = await liveEngine.startExecution(workflow, {
        apiKey: "sk-live-test-key",
      });

      expect(pausedRun.status).toBe("Waiting for Approval");
      expect(pausedRun.currentWaitingNodeId).toBe("approval");

      // Verify auditor node executed real work
      const auditorExec = pausedRun.nodeExecutions.find((ne) => ne.nodeId === "auditor");
      expect(auditorExec).toBeDefined();
      expect(auditorExec?.status).toBe("Succeeded");
      expect(auditorExec?.outputs?.toolCallsCount).toBe(1);
      expect(auditorExec?.outputs?.toolsExecuted).toContain("analyze_code_structure");
      expect(auditorExec?.outputs?.response).toContain("Verified PaymentGateway");

      // Verify context handoff was generated from live agent to approval gate
      const handoff = pausedRun.handoffs?.find((h) => h.sourceNodeId === "auditor" && h.destinationNodeId === "approval");
      expect(handoff).toBeDefined();
      expect(handoff?.isSimulated).toBe(false);

      // Verify real artifact was created
      expect(pausedRun.artifacts?.length).toBeGreaterThanOrEqual(1);
      expect(pausedRun.artifacts![0].name).toContain("Deliverable");

      // 5. Resume execution with lead approval
      const finishedRun = await liveEngine.resumeExecution(pausedRun.id, {
        action: "approve",
        approver: "Security Lead",
        comment: "PaymentGateway structure and security verified.",
      });

      expect(finishedRun.status).toBe("Succeeded");
      const approvalExec = finishedRun.nodeExecutions.find((ne) => ne.nodeId === "approval");
      const endExec = finishedRun.nodeExecutions.find((ne) => ne.nodeId === "end");
      expect(approvalExec?.status).toBe("Succeeded");
      expect(approvalExec?.approvalStatus).toBe("approved");
      expect(endExec?.status).toBe("Succeeded");

      // 6. Security tests: Verify malicious tool call attempting path traversal is rejected
      const maliciousCall = {
        name: "read_workspace_file",
        arguments: { path: "../../../etc/shadow" },
      };
      const check = PermissionEnforcer.checkPermission(
        maliciousCall.name,
        maliciousCall.arguments,
        agent.permissionPolicy,
        tempDir
      );
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("Sandbox violation");

      // Verify stored execution record does not leak any plaintext API keys
      const storedJson = JSON.stringify(finishedRun);
      expect(storedJson).not.toContain("sk-live-test-key");
    });
  });
});
