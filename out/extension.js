"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode3 = __toESM(require("vscode"));

// src/providers/AgentForgeViewProvider.ts
var vscode = __toESM(require("vscode"));
var import_fs = require("fs");

// src/bridge/messages.ts
var REQUEST_TYPES = [
  "app.ready",
  "app.getState",
  "app.getDashboardData",
  "skills.list",
  "agents.list",
  "workflows.list",
  "executions.list",
  "settings.get",
  "settings.update",
  "app.navigate"
];
function isMessageType(value) {
  return typeof value === "string" && REQUEST_TYPES.includes(value);
}
function isBaseMessage(value) {
  if (!value || typeof value !== "object")
    return false;
  const candidate = value;
  return typeof candidate.type === "string" && typeof candidate.id === "string" && isMessageType(candidate.type);
}

// src/bridge/messageValidator.ts
var ROUTE_PATTERN = /^[a-zA-Z0-9_.-]+$/;
function validateIncomingMessage(raw) {
  if (!isBaseMessage(raw)) {
    return { ok: false, error: "Invalid message envelope" };
  }
  const msg = raw;
  if (!msg.id || msg.id.length > 128) {
    return { ok: false, error: "Invalid request id" };
  }
  const payloadError = validatePayload(msg.type, msg.payload);
  if (payloadError) {
    return { ok: false, error: payloadError };
  }
  return { ok: true, message: msg };
}
function validatePayload(type, payload) {
  switch (type) {
    case "app.ready":
    case "app.getState":
    case "app.getDashboardData":
    case "skills.list":
    case "agents.list":
    case "workflows.list":
    case "executions.list":
    case "settings.get":
      return null;
    case "app.navigate": {
      const p = payload;
      if (!p || typeof p.route !== "string" || !ROUTE_PATTERN.test(p.route)) {
        return "Invalid route";
      }
      return null;
    }
    case "settings.update": {
      const p = payload;
      if (!p || typeof p.settings !== "object" || p.settings === null) {
        return "Invalid settings payload";
      }
      return null;
    }
    default:
      return `Unsupported message type: ${type}`;
  }
}
function makeResponse(requestId, ok, data, error) {
  return {
    type: "response",
    requestId,
    ok,
    data,
    error
  };
}
function unsupportedResponse(requestId, feature) {
  return makeResponse(requestId, false, void 0, `${feature} is not yet implemented`);
}

// src/providers/AgentForgeViewProvider.ts
var APP_VERSION = "0.1.0";
var AgentForgeViewProvider = class {
  constructor(context, repo, channel) {
    this.context = context;
    this.repo = repo;
    this.channel = channel;
  }
  static {
    this.viewType = "agentforge.view";
  }
  resolveWebviewView(webviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview")]
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    const messageDisposable = webviewView.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message, webviewView),
      void 0,
      this.context.subscriptions
    );
    const disposeDisposable = webviewView.onDidDispose(() => {
      messageDisposable.dispose();
      disposeDisposable.dispose();
    });
  }
  async handleMessage(raw, view) {
    const result = validateIncomingMessage(raw);
    if (!result.ok) {
      this.channel.appendLine(`Rejected message: ${result.error}`);
      const errorResponse = {
        type: "response",
        requestId: raw?.id ?? "unknown",
        ok: false,
        error: result.error
      };
      await view.webview.postMessage(errorResponse);
      return;
    }
    const msg = result.message;
    try {
      const data = await this.dispatch(msg);
      await view.webview.postMessage(makeResponse(msg.id, true, data));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      this.channel.appendLine(`Message ${msg.type} (${msg.id}) failed: ${message}`);
      await view.webview.postMessage(makeResponse(msg.id, false, void 0, message));
    }
  }
  async dispatch(msg) {
    switch (msg.type) {
      case "app.ready":
        return { version: APP_VERSION };
      case "app.getState": {
        const settings = await this.repo.getSettings();
        return { version: APP_VERSION, settings };
      }
      case "app.getDashboardData":
        return this.repo.getDashboardData();
      case "skills.list":
        return this.repo.listSkills();
      case "agents.list":
        return this.repo.listAgents();
      case "workflows.list":
        return this.repo.listWorkflows();
      case "executions.list":
        return this.repo.listExecutions();
      case "settings.get":
        return this.repo.getSettings();
      case "settings.update": {
        const payload = msg.payload;
        return this.repo.updateSettings(payload.settings);
      }
      case "app.navigate": {
        const payload = msg.payload;
        return { ok: true, route: payload.route };
      }
      default:
        return unsupportedResponse(msg.id, String(msg.type));
    }
  }
  getHtml(webview) {
    const dist = vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview");
    const scriptPath = vscode.Uri.joinPath(dist, "assets", "index.js");
    const stylePath = vscode.Uri.joinPath(dist, "assets", "index.css");
    if (!this.assetExists(scriptPath) || !this.assetExists(stylePath)) {
      this.channel.appendLine(
        "WebView assets missing. Run 'npm run build' before launching the extension host."
      );
      return this.errorHtml(
        "AgentForge assets are missing. Run <code>npm run build</code> in the project root, then reopen this view."
      );
    }
    const scriptUri = webview.asWebviewUri(scriptPath);
    const styleUri = webview.asWebviewUri(stylePath);
    const nonce = getNonce();
    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `font-src ${webview.cspSource}`
    ].join("; ");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>AgentForge</title>
<link rel="stylesheet" href="${styleUri}" />
</head>
<body>
<div id="root"></div>
<div id="error-fallback" style="display:none;padding:16px;font-family:sans-serif;color:#B91C1C;">
  AgentForge failed to load. Check the AgentForge output channel for details.
</div>
<script nonce="${nonce}" src="${scriptUri}"></script>
<script nonce="${nonce}">
  window.addEventListener('load', function () {
    var root = document.getElementById('root');
    if (!root || root.children.length === 0) {
      var fb = document.getElementById('error-fallback');
      if (fb) { fb.style.display = 'block'; }
    }
  });
</script>
</body>
</html>`;
  }
  assetExists(uri) {
    try {
      (0, import_fs.statSync)(uri.fsPath);
      return true;
    } catch {
      return false;
    }
  }
  errorHtml(message) {
    return `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="font-family: sans-serif; padding: 16px; color: #18233B;">
<p>${message}</p>
</body>
</html>`;
  }
};
function getNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

// src/storage/sampleData.ts
var iso = (s) => s;
var sampleSkills = [
  {
    id: "skill-security-audit",
    name: "Security Audit Skill",
    description: "Reviews source for common vulnerability classes and reports findings with severity.",
    version: "1.2.0",
    category: "Security",
    tags: ["security", "audit", "owasp"],
    instructions: "Analyze source files for injection, auth flaws, and secret leakage. Produce a severity-ranked report.",
    compatibility: ["copilot", "claude", "openai"],
    status: "Ready",
    createdAt: iso("2026-09-01T10:00:00Z"),
    updatedAt: iso("2026-10-12T14:22:00Z")
  },
  {
    id: "skill-code-review",
    name: "Code Review Skill",
    description: "Performs structural code review against team standards.",
    version: "0.9.4",
    category: "Review",
    tags: ["review", "quality"],
    instructions: "Review diffs for readability, complexity, and naming. Suggest non-blocking improvements.",
    compatibility: ["copilot", "claude"],
    status: "Ready",
    createdAt: iso("2026-09-04T09:30:00Z"),
    updatedAt: iso("2026-10-11T08:10:00Z")
  },
  {
    id: "skill-token-efficiency",
    name: "Token Efficiency Skill",
    description: "Rewrites prompts and outputs to reduce token usage.",
    version: "0.4.1",
    category: "Optimization",
    tags: ["tokens", "cost"],
    instructions: "Compress prompts while preserving intent. Report estimated token savings.",
    compatibility: ["openai", "claude"],
    status: "Draft",
    createdAt: iso("2026-09-22T16:00:00Z"),
    updatedAt: iso("2026-10-09T12:00:00Z")
  },
  {
    id: "skill-test-generation",
    name: "Test Generation Skill",
    description: "Generates unit tests from source signatures and examples.",
    version: "1.0.0",
    category: "Testing",
    tags: ["testing", "unit"],
    instructions: "Generate focused unit tests covering public APIs and edge cases.",
    compatibility: ["copilot", "claude", "openai"],
    status: "Ready",
    createdAt: iso("2026-09-10T11:15:00Z"),
    updatedAt: iso("2026-10-08T17:45:00Z")
  },
  {
    id: "skill-architecture-analysis",
    name: "Architecture Analysis Skill",
    description: "Maps modules and surfaces coupling and layering issues.",
    version: "0.6.2",
    category: "Architecture",
    tags: ["architecture", "coupling"],
    instructions: "Build a dependency graph and flag circular dependencies and layer violations.",
    compatibility: ["claude", "openai"],
    status: "Ready",
    createdAt: iso("2026-09-14T13:20:00Z"),
    updatedAt: iso("2026-10-07T10:30:00Z")
  }
];
var sampleAgents = [
  {
    id: "agent-architecture",
    name: "Architecture Agent",
    description: "Owns module structure and cross-cutting design decisions.",
    role: "Architect",
    objective: "Maintain a coherent, extensible architecture across features.",
    instructions: "Prefer small modules with clear contracts. Avoid premature abstraction.",
    assignedSkillIds: ["skill-architecture-analysis"],
    toolDefinitions: [
      {
        id: "tool-graph",
        name: "DependencyGraph",
        description: "Build a project dependency graph.",
        schema: { type: "object" }
      }
    ],
    permissionPolicy: { network: false, fileSystem: "read", shell: false, maxTokens: 8e3 },
    inputSchema: { type: "object", required: ["projectRoot"] },
    outputSchema: { type: "object" },
    compatibility: ["claude", "openai"],
    version: "1.1.0",
    status: "Ready",
    createdAt: iso("2026-09-02T09:00:00Z"),
    updatedAt: iso("2026-10-13T09:12:00Z")
  },
  {
    id: "agent-planning",
    name: "Planning Agent",
    description: "Breaks down work into ordered, sized tasks.",
    role: "Planner",
    objective: "Produce executable plans with clear acceptance criteria.",
    instructions: "Decompose epics into tasks. Assign estimated effort.",
    assignedSkillIds: ["skill-architecture-analysis"],
    toolDefinitions: [],
    permissionPolicy: { network: false, fileSystem: "read", shell: false, maxTokens: 6e3 },
    inputSchema: { type: "object", required: ["epic"] },
    outputSchema: { type: "object" },
    compatibility: ["copilot", "claude", "openai"],
    version: "1.0.0",
    status: "Ready",
    createdAt: iso("2026-09-05T09:30:00Z"),
    updatedAt: iso("2026-10-12T16:40:00Z")
  },
  {
    id: "agent-implementation",
    name: "Implementation Agent",
    description: "Writes code changes for planned tasks.",
    role: "Implementer",
    objective: "Deliver working code matching the plan.",
    instructions: "Follow existing conventions. Keep diffs minimal.",
    assignedSkillIds: ["skill-code-review", "skill-test-generation"],
    toolDefinitions: [],
    permissionPolicy: { network: false, fileSystem: "readwrite", shell: false, maxTokens: 12e3 },
    inputSchema: { type: "object", required: ["task"] },
    outputSchema: { type: "object" },
    compatibility: ["copilot", "claude", "openai"],
    version: "1.2.0",
    status: "Ready",
    createdAt: iso("2026-09-06T09:30:00Z"),
    updatedAt: iso("2026-10-11T11:20:00Z")
  },
  {
    id: "agent-static-review",
    name: "Static Code Review Agent",
    description: "Runs review skills and aggregates findings.",
    role: "Reviewer",
    objective: "Surface quality and security issues before merge.",
    instructions: "Run review and security skills. Summarize by severity.",
    assignedSkillIds: ["skill-code-review", "skill-security-audit"],
    toolDefinitions: [],
    permissionPolicy: { network: false, fileSystem: "read", shell: false, maxTokens: 8e3 },
    inputSchema: { type: "object", required: ["diff"] },
    outputSchema: { type: "object" },
    compatibility: ["copilot", "claude"],
    version: "0.9.0",
    status: "Ready",
    createdAt: iso("2026-09-08T09:30:00Z"),
    updatedAt: iso("2026-10-10T08:05:00Z")
  },
  {
    id: "agent-test-validation",
    name: "Test Validation Agent",
    description: "Generates and validates tests for changes.",
    role: "Tester",
    objective: "Ensure tests exist and pass for new code.",
    instructions: "Generate tests, run them, and report failures.",
    assignedSkillIds: ["skill-test-generation"],
    toolDefinitions: [],
    permissionPolicy: { network: false, fileSystem: "readwrite", shell: true, maxTokens: 1e4 },
    inputSchema: { type: "object", required: ["changes"] },
    outputSchema: { type: "object" },
    compatibility: ["copilot", "claude", "openai"],
    version: "1.0.1",
    status: "Experimental",
    createdAt: iso("2026-09-12T09:30:00Z"),
    updatedAt: iso("2026-10-09T14:15:00Z")
  },
  {
    id: "agent-documentation",
    name: "Documentation Agent",
    description: "Updates docs to reflect code changes.",
    role: "Tech Writer",
    objective: "Keep documentation accurate and discoverable.",
    instructions: "Update READMEs and API docs. Avoid duplicating code comments.",
    assignedSkillIds: [],
    toolDefinitions: [],
    permissionPolicy: { network: false, fileSystem: "readwrite", shell: false, maxTokens: 6e3 },
    inputSchema: { type: "object", required: ["changes"] },
    outputSchema: { type: "object" },
    compatibility: ["copilot", "claude", "openai"],
    version: "0.8.0",
    status: "Draft",
    createdAt: iso("2026-09-20T09:30:00Z"),
    updatedAt: iso("2026-10-06T09:30:00Z")
  }
];
var workflowNodes = {
  "wf-feature-delivery": [
    {
      id: "n-input",
      type: "input",
      name: "Feature Request",
      configuration: {},
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      position: { x: 0, y: 0 }
    },
    {
      id: "n-plan",
      type: "agent",
      name: "Planning Agent",
      configuration: { agentId: "agent-planning" },
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      position: { x: 200, y: 0 }
    },
    {
      id: "n-impl",
      type: "agent",
      name: "Implementation Agent",
      configuration: { agentId: "agent-implementation" },
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      position: { x: 400, y: 0 }
    },
    {
      id: "n-review",
      type: "approval",
      name: "Code Review Gate",
      configuration: {},
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      position: { x: 600, y: 0 }
    },
    {
      id: "n-output",
      type: "output",
      name: "Merged Feature",
      configuration: {},
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      position: { x: 800, y: 0 }
    }
  ],
  "wf-security-review": [
    {
      id: "s-input",
      type: "input",
      name: "Diff Input",
      configuration: {},
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      position: { x: 0, y: 0 }
    },
    {
      id: "s-audit",
      type: "agent",
      name: "Static Review Agent",
      configuration: { agentId: "agent-static-review" },
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      position: { x: 200, y: 0 }
    },
    {
      id: "s-out",
      type: "output",
      name: "Audit Report",
      configuration: {},
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      position: { x: 400, y: 0 }
    }
  ],
  "wf-release-readiness": [
    {
      id: "r-input",
      type: "input",
      name: "Release Candidate",
      configuration: {},
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      position: { x: 0, y: 0 }
    },
    {
      id: "r-test",
      type: "agent",
      name: "Test Validation Agent",
      configuration: { agentId: "agent-test-validation" },
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      position: { x: 200, y: 0 }
    },
    {
      id: "r-docs",
      type: "agent",
      name: "Documentation Agent",
      configuration: { agentId: "agent-documentation" },
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      position: { x: 400, y: 0 }
    },
    {
      id: "r-out",
      type: "output",
      name: "Release Sign-off",
      configuration: {},
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      position: { x: 600, y: 0 }
    }
  ]
};
var workflowEdges = {
  "wf-feature-delivery": [
    { id: "e1", source: "n-input", target: "n-plan" },
    { id: "e2", source: "n-plan", target: "n-impl" },
    { id: "e3", source: "n-impl", target: "n-review" },
    { id: "e4", source: "n-review", target: "n-output" }
  ],
  "wf-security-review": [
    { id: "se1", source: "s-input", target: "s-audit" },
    { id: "se2", source: "s-audit", target: "s-out" }
  ],
  "wf-release-readiness": [
    { id: "re1", source: "r-input", target: "r-test" },
    { id: "re2", source: "r-test", target: "r-docs" },
    { id: "re3", source: "r-docs", target: "r-out" }
  ]
};
var sampleWorkflows = [
  {
    id: "wf-feature-delivery",
    name: "Enterprise Feature Delivery",
    description: "Plan, implement, review, and deliver a feature end-to-end.",
    version: "1.0.0",
    nodes: workflowNodes["wf-feature-delivery"],
    edges: workflowEdges["wf-feature-delivery"],
    executionSettings: {
      maxParallelNodes: 2,
      retryPolicy: { maxRetries: 2, backoffSeconds: 5 },
      requireApprovalFor: ["n-review"]
    },
    status: "Active",
    createdAt: iso("2026-09-15T10:00:00Z"),
    updatedAt: iso("2026-10-13T15:00:00Z")
  },
  {
    id: "wf-security-review",
    name: "Security Review Pipeline",
    description: "Static security review on every change.",
    version: "0.9.0",
    nodes: workflowNodes["wf-security-review"],
    edges: workflowEdges["wf-security-review"],
    executionSettings: {
      maxParallelNodes: 1,
      retryPolicy: { maxRetries: 1, backoffSeconds: 3 },
      requireApprovalFor: []
    },
    status: "Ready",
    createdAt: iso("2026-09-18T10:00:00Z"),
    updatedAt: iso("2026-10-10T11:00:00Z")
  },
  {
    id: "wf-release-readiness",
    name: "Release Readiness Pipeline",
    description: "Validates tests and docs before release sign-off.",
    version: "0.5.0",
    nodes: workflowNodes["wf-release-readiness"],
    edges: workflowEdges["wf-release-readiness"],
    executionSettings: {
      maxParallelNodes: 2,
      retryPolicy: { maxRetries: 0, backoffSeconds: 0 },
      requireApprovalFor: ["r-out"]
    },
    status: "Draft",
    createdAt: iso("2026-09-25T10:00:00Z"),
    updatedAt: iso("2026-10-05T10:00:00Z")
  }
];
var sampleExecutions = [
  {
    id: "exec-1001",
    workflowId: "wf-feature-delivery",
    workflowVersion: "1.0.0",
    status: "Succeeded",
    startedAt: iso("2026-10-13T15:00:00Z"),
    completedAt: iso("2026-10-13T15:12:00Z"),
    nodeExecutions: [
      { nodeId: "n-plan", status: "Succeeded", startedAt: iso("2026-10-13T15:00:00Z"), completedAt: iso("2026-10-13T15:02:00Z") },
      { nodeId: "n-impl", status: "Succeeded", startedAt: iso("2026-10-13T15:02:00Z"), completedAt: iso("2026-10-13T15:08:00Z") },
      { nodeId: "n-review", status: "Succeeded", startedAt: iso("2026-10-13T15:08:00Z"), completedAt: iso("2026-10-13T15:10:00Z") },
      { nodeId: "n-output", status: "Succeeded", startedAt: iso("2026-10-13T15:10:00Z"), completedAt: iso("2026-10-13T15:12:00Z") }
    ],
    finalSummary: "Feature delivered and merged."
  },
  {
    id: "exec-1002",
    workflowId: "wf-security-review",
    workflowVersion: "0.9.0",
    status: "Failed",
    startedAt: iso("2026-10-11T11:00:00Z"),
    completedAt: iso("2026-10-11T11:04:00Z"),
    nodeExecutions: [
      { nodeId: "s-audit", status: "Failed", startedAt: iso("2026-10-11T11:00:00Z"), completedAt: iso("2026-10-11T11:04:00Z"), summary: "High-severity finding blocked merge." }
    ],
    finalSummary: "Security review blocked merge."
  },
  {
    id: "exec-1003",
    workflowId: "wf-feature-delivery",
    workflowVersion: "1.0.0",
    status: "Running",
    startedAt: iso("2026-10-14T09:00:00Z"),
    nodeExecutions: [
      { nodeId: "n-plan", status: "Succeeded", startedAt: iso("2026-10-14T09:00:00Z"), completedAt: iso("2026-10-14T09:02:00Z") },
      { nodeId: "n-impl", status: "Running", startedAt: iso("2026-10-14T09:02:00Z") }
    ]
  },
  {
    id: "exec-1004",
    workflowId: "wf-release-readiness",
    workflowVersion: "0.5.0",
    status: "Succeeded",
    startedAt: iso("2026-10-05T10:00:00Z"),
    completedAt: iso("2026-10-05T10:18:00Z"),
    nodeExecutions: [],
    finalSummary: "Release candidate validated."
  },
  {
    id: "exec-1005",
    workflowId: "wf-security-review",
    workflowVersion: "0.9.0",
    status: "Cancelled",
    startedAt: iso("2026-10-02T08:00:00Z"),
    completedAt: iso("2026-10-02T08:01:00Z"),
    nodeExecutions: []
  }
];
var sampleIntegrations = [
  {
    id: "int-copilot",
    name: "GitHub Copilot",
    kind: "copilot",
    status: "Not Connected",
    description: "Export skills and agents as Copilot instructions and chat participants."
  },
  {
    id: "int-claude",
    name: "Claude / Claude Code",
    kind: "claude",
    status: "Not Connected",
    description: "Export agents as Claude Code subagents and skill manifests."
  },
  {
    id: "int-openai",
    name: "OpenAI API",
    kind: "openai",
    status: "Mock",
    description: "Adapter scaffold for OpenAI-compatible APIs. No live calls are made."
  }
];

// src/storage/settingsDefaults.ts
var STORAGE_SCHEMA_VERSION = 1;
var DEFAULT_SETTINGS = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  theme: "light",
  defaultPlatform: "neutral",
  telemetry: false,
  autoSave: true,
  recentRoute: "dashboard"
};

// src/storage/LocalRepository.ts
var LocalRepository = class {
  constructor(context) {
    this.context = context;
    this.state = this.load();
  }
  load() {
    const raw = this.context.globalState.get("agentforge.state");
    if (raw && raw.schemaVersion === STORAGE_SCHEMA_VERSION && raw.settings) {
      return raw;
    }
    const fresh = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      settings: { ...DEFAULT_SETTINGS },
      skills: [...sampleSkills],
      agents: [...sampleAgents],
      workflows: [...sampleWorkflows],
      executions: [...sampleExecutions]
    };
    this.context.globalState.update("agentforge.state", fresh);
    return fresh;
  }
  persist() {
    this.context.globalState.update("agentforge.state", this.state);
  }
  async listSkills() {
    return [...this.state.skills];
  }
  async listAgents() {
    return [...this.state.agents];
  }
  async listWorkflows() {
    return [...this.state.workflows];
  }
  async listExecutions() {
    return [...this.state.executions];
  }
  async getSettings() {
    return { ...this.state.settings };
  }
  async updateSettings(patch) {
    this.state.settings = { ...this.state.settings, ...patch, schemaVersion: STORAGE_SCHEMA_VERSION };
    this.persist();
    return { ...this.state.settings };
  }
  async getDashboardData() {
    const skills = this.state.skills;
    const agents = this.state.agents;
    const workflows = this.state.workflows;
    const executions = this.state.executions;
    const integrations = sampleIntegrations;
    const pipelineRuns = executions.length;
    const successfulRuns = executions.filter((e) => e.status === "Succeeded").length;
    const failedRuns = executions.filter((e) => e.status === "Failed").length;
    const installedPackages = this.countInstalledPackages();
    const recentActivity = [
      ...skills.map((s) => ({
        id: `skill-${s.id}`,
        kind: "skill",
        label: `Skill "${s.name}" updated`,
        timestamp: s.updatedAt,
        status: s.status
      })),
      ...agents.map((a) => ({
        id: `agent-${a.id}`,
        kind: "agent",
        label: `Agent "${a.name}" updated`,
        timestamp: a.updatedAt,
        status: a.status
      })),
      ...executions.map((e) => ({
        id: `exec-${e.id}`,
        kind: "execution",
        label: `Pipeline run ${e.id}`,
        timestamp: e.startedAt,
        status: e.status
      }))
    ].sort((a, b) => a.timestamp < b.timestamp ? 1 : -1).slice(0, 8);
    const recentSkills = [...skills].sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1).slice(0, 5);
    const recentAgents = [...agents].sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1).slice(0, 5);
    const recentExecutions = [...executions].sort((a, b) => a.startedAt < b.startedAt ? 1 : -1).slice(0, 6);
    return {
      metrics: {
        totalSkills: skills.length,
        totalAgents: agents.length,
        totalPipelines: workflows.length,
        pipelineRuns,
        successfulRuns,
        failedRuns,
        installedPackages
      },
      recentActivity,
      recentSkills,
      recentAgents,
      recentExecutions,
      integrations
    };
  }
  countInstalledPackages() {
    return new Set(this.state.skills.map((s) => s.category)).size + this.state.workflows.length;
  }
  async resetDemoData() {
    this.state = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      settings: { ...DEFAULT_SETTINGS },
      skills: [...sampleSkills],
      agents: [...sampleAgents],
      workflows: [...sampleWorkflows],
      executions: [...sampleExecutions]
    };
    this.persist();
  }
  getSettingsSync() {
    return { ...this.state.settings };
  }
};

// src/commands/openAgentForge.ts
var vscode2 = __toESM(require("vscode"));
function registerCommands(context, repo) {
  const focusView = () => {
    vscode2.commands.executeCommand("agentforge.view.focus");
  };
  const open = vscode2.commands.registerCommand("agentforge.open", focusView);
  const openFromSidebar = vscode2.commands.registerCommand("agentforge.openFromSidebar", focusView);
  const reset = vscode2.commands.registerCommand("agentforge.resetDemoData", async () => {
    try {
      await repo.resetDemoData();
      vscode2.window.showInformationMessage("AgentForge demo data has been reset.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      vscode2.window.showErrorMessage(`AgentForge could not reset demo data: ${message}`);
    }
  });
  const status = vscode2.commands.registerCommand("agentforge.showStatus", async () => {
    try {
      const [skills, agents, workflows, executions] = await Promise.all([
        repo.listSkills(),
        repo.listAgents(),
        repo.listWorkflows(),
        repo.listExecutions()
      ]);
      const detail = `${skills.length} skills, ${agents.length} agents, ${workflows.length} pipelines, ${executions.length} runs stored locally.`;
      const action = await vscode2.window.showInformationMessage(
        `AgentForge is active. ${detail}`,
        "Open Workbench"
      );
      if (action === "Open Workbench") {
        focusView();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      vscode2.window.showErrorMessage(`AgentForge status check failed: ${message}`);
    }
  });
  context.subscriptions.push(open, openFromSidebar, reset, status);
}

// src/extension.ts
function activate(context) {
  const channel = vscode3.window.createOutputChannel("AgentForge");
  context.subscriptions.push(channel);
  try {
    const repo = new LocalRepository(context);
    const provider = new AgentForgeViewProvider(context, repo, channel);
    context.subscriptions.push(
      vscode3.window.registerWebviewViewProvider(AgentForgeViewProvider.viewType, provider, {
        webviewOptions: { retainContextWhenHidden: true }
      })
    );
    registerCommands(context, repo);
    channel.appendLine(`AgentForge activated (version ${context.extension.packageJSON?.version ?? "unknown"})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    channel.appendLine(`Activation failed: ${message}`);
    vscode3.window.showErrorMessage(`AgentForge failed to activate: ${message}`);
  }
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
