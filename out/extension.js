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
  "skills.get",
  "skills.create",
  "skills.update",
  "skills.duplicate",
  "skills.delete",
  "skills.validate",
  "skills.history",
  "skills.diff",
  "agents.list",
  "workflows.list",
  "executions.list",
  "settings.get",
  "settings.update",
  "app.resetDemoData",
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
      return null;
    case "skills.get":
    case "skills.duplicate":
    case "skills.delete":
    case "skills.history": {
      const p = payload;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid skill id";
      }
      return null;
    }
    case "skills.create":
    case "skills.update": {
      const p = payload;
      if (!p || typeof p.skill !== "object" || p.skill === null) {
        return "Invalid skill payload";
      }
      if (type === "skills.update") {
        const rec = p.skill;
        if (typeof rec.id !== "string" || rec.id.length === 0 || rec.id.length > 128) {
          return "Invalid skill id";
        }
      }
      return null;
    }
    case "skills.validate": {
      const p = payload;
      if (!p || typeof p.skill !== "object" || p.skill === null) {
        return "Invalid skill payload";
      }
      if (p.id !== void 0 && (typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128)) {
        return "Invalid skill id";
      }
      return null;
    }
    case "skills.diff": {
      const p = payload;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid skill id";
      }
      if (!p || typeof p.skill !== "object" || p.skill === null) {
        return "Invalid skill payload";
      }
      return null;
    }
    case "agents.list":
    case "workflows.list":
    case "executions.list":
    case "settings.get":
    case "app.resetDemoData":
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

// src/skills/SkillValidator.ts
var ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
var SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
var ALLOWED_PLATFORMS = ["copilot", "claude", "openai", "neutral"];
var ALLOWED_STATUSES = ["Draft", "Ready", "Deprecated"];
var ALLOWED_RESOURCE_KINDS = ["file", "script", "template", "reference", "example", "test"];
var ALLOWED_INSTALLATION_STATES = ["not-installed", "installed", "outdated"];
var YAML_KEY_PATTERN = /^[\w."'-]+\s*:/;
var YAML_LIST_PATTERN = /^-\s+/;
var YAML_BLOCK_SCALAR_PATTERN = /:\s*(\||>)\s*$/;
var FORBIDDEN_DECLARATIONS = [
  "import ",
  "require(",
  "eval(",
  "function ",
  "process.env",
  "child_process",
  "fs.readFileSync",
  "fetch(",
  "curl ",
  "wget ",
  "shell_exec",
  "exec("
];
function defaultValidationContext() {
  return {
    existingIds: /* @__PURE__ */ new Set(),
    knownResourceKinds: new Set(ALLOWED_RESOURCE_KINDS)
  };
}
function validateSkill(skill, ctx = defaultValidationContext()) {
  const errors = [];
  const warnings = [];
  const suggestions = [];
  const name = typeof skill.name === "string" ? skill.name.trim() : "";
  if (!name) {
    errors.push({ severity: "error", field: "name", message: "Name is required." });
  } else if (name.length > 96) {
    errors.push({ severity: "error", field: "name", message: "Name must be 96 characters or fewer." });
  }
  const id = typeof skill.id === "string" ? skill.id.trim() : "";
  if (!id) {
    errors.push({ severity: "error", field: "id", message: "Identifier is required." });
  } else if (!ID_PATTERN.test(id)) {
    errors.push({
      severity: "error",
      field: "id",
      message: "Identifier must be lowercase letters, digits, and dashes only, and start with a letter or digit."
    });
  } else if (id.length > 64) {
    errors.push({ severity: "error", field: "id", message: "Identifier must be 64 characters or fewer." });
  } else if (ctx.existingIds.has(id) && ctx.selfId !== id) {
    errors.push({ severity: "error", field: "id", message: `A skill with identifier "${id}" already exists.` });
  }
  const description = typeof skill.description === "string" ? skill.description.trim() : "";
  if (!description) {
    errors.push({ severity: "error", field: "description", message: "Description is required." });
  } else if (description.length > 512) {
    warnings.push({ severity: "warning", field: "description", message: "Description is long; consider trimming for dashboards." });
  }
  const version = typeof skill.version === "string" ? skill.version.trim() : "";
  if (!version) {
    errors.push({ severity: "error", field: "version", message: "Version is required." });
  } else if (!SEMVER_PATTERN.test(version)) {
    errors.push({ severity: "error", field: "version", message: "Version must follow semantic versioning, e.g. 1.0.0." });
  }
  const instructions = typeof skill.instructions === "string" ? skill.instructions : "";
  if (!instructions.trim()) {
    errors.push({ severity: "error", field: "instructions", message: "Instructions are required." });
  } else if (instructions.trim().length < 20) {
    suggestions.push({ severity: "suggestion", field: "instructions", message: "Instructions are short; describe steps, inputs, and expected outputs for reliable execution." });
  }
  if (skill.frontmatter && skill.frontmatter.trim()) {
    const fmErrors = validateFrontmatter(skill.frontmatter);
    warnings.push(...fmErrors);
  }
  if (Array.isArray(skill.resources)) {
    const seenResourceIds = /* @__PURE__ */ new Set();
    for (const [i, r] of skill.resources.entries()) {
      const findings = validateResource(r, i, seenResourceIds, ctx);
      errors.push(...findings.filter((f) => f.severity === "error"));
      warnings.push(...findings.filter((f) => f.severity === "warning"));
      suggestions.push(...findings.filter((f) => f.severity === "suggestion"));
    }
  }
  if (Array.isArray(skill.compatibility)) {
    for (const p of skill.compatibility) {
      if (!ALLOWED_PLATFORMS.includes(p)) {
        errors.push({ severity: "error", field: "compatibility", message: `Unsupported platform: "${p}".` });
      }
    }
    if (skill.compatibility.includes("openai")) {
      warnings.push({ severity: "warning", field: "compatibility", message: "OpenAI targets are honored only where the consuming application supports a compatible skill mechanism." });
    }
  }
  if (skill.status && !ALLOWED_STATUSES.includes(skill.status)) {
    errors.push({ severity: "error", field: "status", message: `Invalid status: "${skill.status}".` });
  }
  if (skill.installationState && !ALLOWED_INSTALLATION_STATES.includes(skill.installationState)) {
    errors.push({ severity: "error", field: "installationState", message: `Invalid installation state: "${skill.installationState}".` });
  }
  if (Array.isArray(skill.tags)) {
    for (const tag of skill.tags) {
      if (typeof tag !== "string" || !tag.trim()) {
        warnings.push({ severity: "warning", field: "tags", message: "Empty tags are ignored." });
      }
    }
  }
  const requiredTools = Array.isArray(skill.requiredTools) ? skill.requiredTools : [];
  const permissions = Array.isArray(skill.permissions) ? skill.permissions : [];
  if (requiredTools.length === 0 && instructions.trim()) {
    suggestions.push({ severity: "suggestion", field: "requiredTools", message: "No required tools declared. Add at least one so consumers know what capabilities the skill expects." });
  }
  if (permissions.length === 0 && instructions.trim()) {
    suggestions.push({ severity: "suggestion", field: "permissions", message: "No permissions declared. Explicit permissions make review and governance easier." });
  }
  const declarationFindings = scanUnsupportedDeclarations(instructions);
  errors.push(...declarationFindings.filter((f) => f.severity === "error"));
  warnings.push(...declarationFindings.filter((f) => f.severity === "warning"));
  if (!skill.author || !skill.author.trim()) {
    suggestions.push({ severity: "suggestion", field: "author", message: "Author is empty; adding an author aids governance and change attribution." });
  }
  if (!skill.changelog || !skill.changelog.trim()) {
    suggestions.push({ severity: "suggestion", field: "changelog", message: "Changelog is empty; record version changes for traceability." });
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}
function validateResource(resource, index, seen, ctx) {
  const findings = [];
  const path2 = `resources[${index}]`;
  if (!resource || typeof resource !== "object") {
    findings.push({ severity: "error", field: path2, message: "Resource is malformed." });
    return findings;
  }
  if (!resource.id || !resource.id.trim()) {
    findings.push({ severity: "error", field: `${path2}.id`, message: "Resource id is required." });
  } else if (seen.has(resource.id)) {
    findings.push({ severity: "error", field: `${path2}.id`, message: `Duplicate resource id: "${resource.id}".` });
  } else {
    seen.add(resource.id);
  }
  if (!resource.name || !resource.name.trim()) {
    findings.push({ severity: "error", field: `${path2}.name`, message: "Resource name is required." });
  }
  if (!resource.kind || !ctx.knownResourceKinds.has(resource.kind)) {
    findings.push({ severity: "error", field: `${path2}.kind`, message: `Unsupported resource kind: "${resource.kind}".` });
  }
  if (!resource.description || !resource.description.trim()) {
    findings.push({ severity: "warning", field: `${path2}.description`, message: "Resource description is empty." });
  }
  return findings;
}
function validateFrontmatter(raw) {
  const findings = [];
  const text = raw.trim();
  if (text.startsWith("---") && text.endsWith("---")) {
    return findings;
  }
  const lines = text.split(/\r?\n/);
  let bad = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#"))
      continue;
    const ok = YAML_KEY_PATTERN.test(trimmed) || YAML_LIST_PATTERN.test(trimmed) || YAML_BLOCK_SCALAR_PATTERN.test(trimmed);
    if (!ok)
      bad += 1;
  }
  if (bad > 0) {
    findings.push({
      severity: "warning",
      field: "frontmatter",
      message: `${bad} line(s) do not look like YAML key:value or list entries; they will be preserved verbatim.`
    });
  }
  return findings;
}
function scanUnsupportedDeclarations(instructions) {
  const findings = [];
  if (!instructions)
    return findings;
  const lines = instructions.split(/\r?\n/);
  let inFence = false;
  for (const [i, line] of lines.entries()) {
    const stripped = line.trim();
    if (stripped.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence)
      continue;
    for (const decl of FORBIDDEN_DECLARATIONS) {
      if (stripped.toLowerCase().includes(decl)) {
        findings.push({
          severity: "warning",
          field: `instructions:${i + 1}`,
          message: `Possible unsupported declaration "${decl.trim()}" in instructions. Use fenced code blocks for examples and avoid executable runtime calls.`
        });
        break;
      }
    }
  }
  return findings;
}
function compareDraftToStored(draft, stored) {
  if (!stored) {
    return { changed: true, changes: [] };
  }
  const fields = [
    "name",
    "description",
    "version",
    "author",
    "category",
    "instructions",
    "frontmatter",
    "changelog",
    "requirements",
    "status"
  ];
  const changes = [];
  for (const field of fields) {
    const from = stored[field];
    const to = draft[field];
    if ((from ?? "") !== (to ?? "")) {
      changes.push({ field, from, to });
    }
  }
  for (const field of ["tags", "compatibility", "otherTargets", "requiredTools", "permissions"]) {
    const fromArr = Array.isArray(stored[field]) ? stored[field] : [];
    const toArr = Array.isArray(draft[field]) ? draft[field] : [];
    if (fromArr.length !== toArr.length || fromArr.some((v, i) => v !== toArr[i])) {
      changes.push({ field, from: fromArr, to: toArr });
    }
  }
  const fromRes = stored.resources.map((r) => `${r.id}:${r.name}:${r.kind}`).join("|");
  const toRes = Array.isArray(draft.resources) ? draft.resources.map((r) => `${r.id}:${r.name}:${r.kind}`).join("|") : "";
  if (fromRes !== toRes) {
    changes.push({ field: "resources", from: fromRes, to: toRes });
  }
  return { changed: changes.length > 0, changes };
}

// src/skills/SkillHistory.ts
function createHistoryStore() {
  const map = /* @__PURE__ */ new Map();
  return {
    get(id) {
      return map.get(id);
    },
    list() {
      return [...map.values()].map(cloneHistory);
    },
    record(skill, summary) {
      const existing = map.get(skill.id);
      const entry = {
        version: skill.version,
        timestamp: skill.updatedAt,
        summary: summary ?? `Saved version ${skill.version}`,
        snapshot: cloneSkill(skill)
      };
      if (!existing) {
        map.set(skill.id, {
          id: skill.id,
          currentVersion: skill.version,
          entries: [entry]
        });
        return;
      }
      if (existing.entries.length > 0 && existing.entries[0].version === skill.version) {
        existing.entries[0] = entry;
      } else {
        existing.entries.unshift(entry);
        if (existing.entries.length > 20) {
          existing.entries.length = 20;
        }
      }
      existing.currentVersion = skill.version;
    },
    remove(id) {
      map.delete(id);
    }
  };
}
function appendChangelog(existing, version, note) {
  const header = `${version} \u2014 ${note}`;
  if (!existing.trim())
    return header;
  if (existing.includes(`${version} \u2014`))
    return existing;
  return `${header}
${existing}`;
}
function cloneSkill(skill) {
  return {
    ...skill,
    tags: [...skill.tags],
    resources: skill.resources.map((r) => ({ ...r })),
    compatibility: [...skill.compatibility],
    otherTargets: [...skill.otherTargets],
    requiredTools: [...skill.requiredTools],
    permissions: [...skill.permissions]
  };
}
function cloneHistory(history) {
  return {
    id: history.id,
    currentVersion: history.currentVersion,
    entries: history.entries.map((e) => ({ ...e, snapshot: cloneSkill(e.snapshot) }))
  };
}

// src/skills/SkillService.ts
var SkillService = class {
  constructor(deps) {
    this.deps = deps;
  }
  async list() {
    return this.deps.store.list();
  }
  async summaries() {
    return this.deps.store.summaries();
  }
  async get(id) {
    return this.deps.store.getSkill(id);
  }
  async create(input) {
    const all = await this.deps.store.list();
    const report = validateSkill(input, {
      ...defaultValidationContext(),
      existingIds: new Set(all.map((s) => s.id))
    });
    if (!report.valid) {
      throw new SkillValidationError(report);
    }
    const skill = await this.deps.store.createSkill(input);
    this.deps.history.record(skill, `Created ${skill.version}`);
    return { skill, report };
  }
  async update(id, patch) {
    const existing = await this.deps.store.getSkill(id);
    if (!existing) {
      throw new Error(`Skill not found: ${id}`);
    }
    const merged = { ...existing, ...patch, id };
    const all = await this.deps.store.list();
    const report = validateSkill(merged, {
      ...defaultValidationContext(),
      existingIds: new Set(all.map((s) => s.id)),
      selfId: id
    });
    if (!report.valid) {
      throw new SkillValidationError(report);
    }
    const versionChanged = (patch.version ?? existing.version) !== existing.version;
    const enrichedPatch = versionChanged ? { ...patch, changelog: appendChangelog(patch.changelog ?? existing.changelog, patch.version ?? existing.version, `Updated`) } : patch;
    const skill = await this.deps.store.updateSkill(id, enrichedPatch);
    this.deps.history.record(skill, `Saved ${skill.version}`);
    return { skill, report };
  }
  async duplicate(id) {
    const copy = await this.deps.store.duplicateSkill(id);
    this.deps.history.record(copy, `Duplicated from ${id}`);
    return copy;
  }
  async remove(id) {
    await this.deps.store.deleteSkill(id);
    this.deps.history.remove(id);
  }
  validate(draft, selfId) {
    return this.withContext(draft, selfId).then((ctx) => validateSkill(draft, ctx));
  }
  async withContext(draft, selfId) {
    const all = await this.deps.store.list();
    return {
      ...defaultValidationContext(),
      existingIds: new Set(all.map((s) => s.id)),
      selfId
    };
  }
  async hasUnsavedChanges(id, draft) {
    const stored = await this.deps.store.getSkill(id);
    return compareDraftToStored(draft, stored).changed;
  }
  async diff(id, draft) {
    const stored = await this.deps.store.getSkill(id);
    return compareDraftToStored(draft, stored);
  }
  history(id) {
    return this.deps.history.get(id);
  }
};
var SkillValidationError = class extends Error {
  constructor(report) {
    super(formatFindings(report.errors));
    this.report = report;
    this.name = "SkillValidationError";
  }
};
function formatFindings(findings) {
  if (findings.length === 0)
    return "Validation failed";
  return findings.map((f) => `[${f.field}] ${f.message}`).join("; ");
}

// src/providers/AgentForgeViewProvider.ts
var APP_VERSION = "0.1.0";
var AgentForgeViewProvider = class {
  constructor(context, repo, channel) {
    this.context = context;
    this.repo = repo;
    this.channel = channel;
    this.skills = new SkillService({ store: repo, history: repo.getHistoryStore() });
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
      case "skills.get": {
        const payload = msg.payload;
        const skill = await this.repo.getSkill(payload.id);
        if (!skill)
          throw new Error(`Skill not found: ${payload.id}`);
        return skill;
      }
      case "skills.create": {
        const payload = msg.payload;
        const { skill } = await this.skills.create(payload.skill);
        return skill;
      }
      case "skills.update": {
        const payload = msg.payload;
        const rec = payload.skill;
        const { skill } = await this.skills.update(rec.id, payload.skill);
        return skill;
      }
      case "skills.duplicate": {
        const payload = msg.payload;
        return this.skills.duplicate(payload.id);
      }
      case "skills.delete": {
        const payload = msg.payload;
        await this.skills.remove(payload.id);
        return { ok: true };
      }
      case "skills.validate": {
        const payload = msg.payload;
        return this.skills.validate(payload.skill, payload.id);
      }
      case "skills.history": {
        const payload = msg.payload;
        return this.repo.getHistory(payload.id);
      }
      case "skills.diff": {
        const payload = msg.payload;
        return this.skills.diff(payload.id, payload.skill);
      }
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
      case "app.resetDemoData":
        await this.repo.resetDemoData();
        return this.repo.getDashboardData();
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
    author: "AgentForge",
    frontmatter: "",
    otherTargets: [],
    requiredTools: ["read_files"],
    permissions: ["filesystem:read"],
    changelog: "1.2.0 \u2014 Updated severity ranking.\n1.0.0 \u2014 Initial version.",
    requirements: "",
    instructions: "Analyze source files for injection, auth flaws, and secret leakage. Produce a severity-ranked report.",
    resources: [
      { id: "res-audit-checklist", name: "owasp-checklist.md", kind: "reference", description: "OWASP Top 10 review checklist." },
      { id: "res-audit-severity", name: "severity-matrix.md", kind: "reference", description: "Severity ranking matrix for findings." }
    ],
    compatibility: ["copilot", "claude", "openai"],
    status: "Ready",
    installationState: "installed",
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
    author: "AgentForge",
    frontmatter: "",
    otherTargets: [],
    requiredTools: ["read_files"],
    permissions: ["filesystem:read"],
    changelog: "0.9.4 \u2014 Rubric refined.\n0.9.0 \u2014 Initial version.",
    requirements: "",
    instructions: "Review diffs for readability, complexity, and naming. Suggest non-blocking improvements.",
    resources: [
      { id: "res-review-rubric", name: "review-rubric.md", kind: "reference", description: "Scoring rubric for structural review." }
    ],
    compatibility: ["copilot", "claude"],
    status: "Ready",
    installationState: "installed",
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
    author: "AgentForge",
    frontmatter: "",
    otherTargets: [],
    requiredTools: ["read_files"],
    permissions: ["filesystem:read"],
    changelog: "0.4.1 \u2014 Benchmarks refreshed.",
    requirements: "",
    instructions: "Compress prompts while preserving intent. Report estimated token savings.",
    resources: [
      { id: "res-token-baseline", name: "baseline-prompts.md", kind: "template", description: "Baseline prompts used for compression benchmarks." }
    ],
    compatibility: ["openai", "claude"],
    status: "Draft",
    installationState: "not-installed",
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
    author: "AgentForge",
    frontmatter: "",
    otherTargets: [],
    requiredTools: ["read_files", "run_tests"],
    permissions: ["filesystem:read", "filesystem:write"],
    changelog: "1.0.0 \u2014 Initial version.",
    requirements: "",
    instructions: "Generate focused unit tests covering public APIs and edge cases.",
    resources: [
      { id: "res-test-conventions", name: "test-conventions.md", kind: "reference", description: "Project test naming and layout conventions." },
      { id: "res-test-scaffold", name: "scaffold-test.ts", kind: "template", description: "Starter template for generated test files." }
    ],
    compatibility: ["copilot", "claude", "openai"],
    status: "Ready",
    installationState: "installed",
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
    author: "AgentForge",
    frontmatter: "",
    otherTargets: [],
    requiredTools: ["read_files"],
    permissions: ["filesystem:read"],
    changelog: "0.6.2 \u2014 Graph script hardened.",
    requirements: "Graphviz (optional)",
    instructions: "Build a dependency graph and flag circular dependencies and layer violations.",
    resources: [
      { id: "res-arch-layer-map", name: "layer-map.md", kind: "reference", description: "Expected layering rules between modules." },
      { id: "res-arch-graph", name: "build-graph.sh", kind: "script", description: "Script that emits a module dependency graph." }
    ],
    compatibility: ["claude", "openai"],
    status: "Ready",
    installationState: "outdated",
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

// src/storage/migrations.ts
var CURRENT_SCHEMA_VERSION = 2;
var MIGRATIONS = [
  {
    from: 1,
    to: 2,
    migrate(state) {
      const v1 = state;
      const v2 = {
        ...v1,
        schemaVersion: 2,
        history: v1.skills.map((s) => ({
          id: s.id,
          currentVersion: s.version,
          entries: [
            {
              version: s.version,
              timestamp: s.updatedAt,
              summary: `Imported from schema v1`,
              snapshot: s
            }
          ]
        }))
      };
      return v2;
    }
  }
];
function migrateToCurrent(raw) {
  if (!raw || typeof raw !== "object") {
    return freshState();
  }
  let state = raw;
  if (typeof state.schemaVersion !== "number") {
    return freshState();
  }
  let current = state.schemaVersion;
  if (current > CURRENT_SCHEMA_VERSION) {
    return freshState();
  }
  while (current < CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS.find((m) => m.from === current);
    if (!migration) {
      return freshState();
    }
    state = migration.migrate(state);
    current = state.schemaVersion;
  }
  return state;
}
function freshState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    skills: [],
    agents: [],
    workflows: [],
    executions: [],
    history: []
  };
}

// src/storage/settingsDefaults.ts
var STORAGE_SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;
var DEFAULT_SETTINGS = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  theme: "light",
  defaultPlatform: "neutral",
  telemetry: false,
  autoSave: true,
  recentRoute: "dashboard"
};

// src/storage/safeStorage.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var diskBackend = {
  async writeAtomic(filePath, contents) {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
    try {
      await fs.promises.writeFile(tmp, contents, { encoding: "utf8" });
      if (os.platform() === "win32") {
        try {
          await fs.promises.unlink(filePath).catch(() => void 0);
        } catch {
        }
      }
      await fs.promises.rename(tmp, filePath);
    } catch (err) {
      await fs.promises.unlink(tmp).catch(() => void 0);
      throw err;
    }
  }
};
function createSafeStorage(backend = diskBackend) {
  return backend;
}
var safeStorage = createSafeStorage();
function serializeJson(value) {
  return JSON.stringify(value, null, 2);
}

// src/storage/LocalRepository.ts
var STORAGE_KEY = "agentforge.state";
var LocalRepository = class {
  constructor(context) {
    this.context = context;
    this.state = this.load();
    this.history = createHistoryStore();
    for (const h of this.state.history) {
      for (const entry of h.entries) {
        this.history.record(entry.snapshot, entry.summary);
      }
    }
  }
  load() {
    const raw = this.context.globalState.get(STORAGE_KEY);
    const migrated = migrateToCurrent(raw);
    if (raw && raw.schemaVersion === CURRENT_SCHEMA_VERSION) {
      return { ...migrated };
    }
    const seeded = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: { ...DEFAULT_SETTINGS },
      skills: [...sampleSkills],
      agents: [...sampleAgents],
      workflows: [...sampleWorkflows],
      executions: [...sampleExecutions],
      history: migrated.history
    };
    this.context.globalState.update(STORAGE_KEY, seeded);
    return seeded;
  }
  persist() {
    const snapshot = {
      ...this.state,
      history: this.history.list().map((h) => ({
        id: h.id,
        currentVersion: h.currentVersion,
        entries: h.entries.map((e) => ({ ...e, snapshot: e.snapshot }))
      }))
    };
    this.state = snapshot;
    this.context.globalState.update(STORAGE_KEY, snapshot);
  }
  async writeBackupFile(filePath) {
    const payload = serializeJson({
      schemaVersion: this.state.schemaVersion,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      skills: this.state.skills,
      history: this.history.list()
    });
    await safeStorage.writeAtomic(filePath, payload);
  }
  async list() {
    return [...this.state.skills];
  }
  async summaries() {
    return this.state.skills.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      version: s.version,
      updatedAt: s.updatedAt
    }));
  }
  async listSkills() {
    return this.list();
  }
  async get(id) {
    return this.getSkill(id);
  }
  async getSkill(id) {
    return this.state.skills.find((s) => s.id === id);
  }
  async createSkill(input) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const requestedId = typeof input.id === "string" && input.id.trim() ? input.id.trim() : void 0;
    const id = requestedId ?? this.uniqueSkillId(input.name ?? "skill");
    if (this.state.skills.some((s) => s.id === id)) {
      throw new Error(`A skill with id "${id}" already exists.`);
    }
    const skill = {
      id,
      name: input.name?.trim() || "Untitled Skill",
      description: input.description ?? "",
      version: input.version ?? "0.1.0",
      author: input.author ?? "",
      category: input.category ?? "General",
      tags: input.tags ?? [],
      instructions: input.instructions ?? "",
      frontmatter: input.frontmatter ?? "",
      resources: input.resources ?? [],
      compatibility: this.sanitizeCompatibility(input.compatibility),
      otherTargets: input.otherTargets ?? [],
      requiredTools: input.requiredTools ?? [],
      permissions: input.permissions ?? [],
      changelog: input.changelog ?? appendChangelog("", input.version ?? "0.1.0", "Initial version"),
      requirements: input.requirements ?? "",
      status: this.sanitizeStatus(input.status),
      installationState: "not-installed",
      createdAt: now,
      updatedAt: now
    };
    this.state.skills = [skill, ...this.state.skills];
    this.history.record(skill, `Created ${skill.version}`);
    this.persist();
    return skill;
  }
  async updateSkill(id, patch) {
    const existing = await this.getSkill(id);
    if (!existing) {
      throw new Error(`Skill not found: ${id}`);
    }
    const newVersion = patch.version ?? existing.version;
    const versionChanged = newVersion !== existing.version;
    const updated = {
      ...existing,
      ...patch,
      id: existing.id,
      author: patch.author ?? existing.author,
      frontmatter: patch.frontmatter ?? existing.frontmatter,
      otherTargets: patch.otherTargets ?? existing.otherTargets,
      requiredTools: patch.requiredTools ?? existing.requiredTools,
      permissions: patch.permissions ?? existing.permissions,
      changelog: patch.changelog ?? existing.changelog,
      requirements: patch.requirements ?? existing.requirements,
      compatibility: this.sanitizeCompatibility(patch.compatibility ?? existing.compatibility),
      status: this.sanitizeStatus(patch.status ?? existing.status),
      installationState: existing.installationState,
      createdAt: existing.createdAt,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (versionChanged) {
      updated.changelog = appendChangelog(updated.changelog, newVersion, `Updated ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`);
    }
    this.state.skills = this.state.skills.map((s) => s.id === id ? updated : s);
    this.history.record(updated, versionChanged ? `Version ${newVersion}` : `Saved edit`);
    this.persist();
    return updated;
  }
  async duplicateSkill(id) {
    const existing = await this.getSkill(id);
    if (!existing) {
      throw new Error(`Skill not found: ${id}`);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const copy = {
      ...existing,
      id: this.uniqueSkillId(existing.name),
      name: `${existing.name} (Copy)`,
      status: "Draft",
      installationState: "not-installed",
      resources: existing.resources.map((r, i) => ({ ...r, id: `${r.id}-copy-${i + 1}` })),
      frontmatter: "",
      changelog: appendChangelog(existing.changelog, existing.version, "Duplicated from original skill"),
      createdAt: now,
      updatedAt: now
    };
    this.state.skills = [copy, ...this.state.skills];
    this.history.record(copy, `Duplicated from ${existing.id}`);
    this.persist();
    return copy;
  }
  async deleteSkill(id) {
    const before = this.state.skills.length;
    this.state.skills = this.state.skills.filter((s) => s.id !== id);
    if (this.state.skills.length === before) {
      throw new Error(`Skill not found: ${id}`);
    }
    this.history.remove(id);
    this.persist();
  }
  getHistory(id) {
    return this.history.get(id);
  }
  listHistory() {
    return this.history.list();
  }
  getHistoryStore() {
    return this.history;
  }
  sanitizeStatus(value) {
    return value === "Ready" || value === "Deprecated" ? value : "Draft";
  }
  sanitizeCompatibility(value) {
    if (!Array.isArray(value))
      return [];
    const allowed = ["copilot", "claude", "openai", "neutral"];
    return value.filter(
      (v) => typeof v === "string" && allowed.includes(v)
    );
  }
  uniqueSkillId(name) {
    const base = `skill-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled"}`;
    let candidate = base;
    let n = 2;
    while (this.state.skills.some((s) => s.id === candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    return candidate;
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
    this.state.settings = { ...this.state.settings, ...patch, schemaVersion: CURRENT_SCHEMA_VERSION };
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
    const fresh = freshState();
    this.state = {
      ...fresh,
      settings: { ...DEFAULT_SETTINGS },
      skills: [...sampleSkills],
      agents: [...sampleAgents],
      workflows: [...sampleWorkflows],
      executions: [...sampleExecutions]
    };
    this.history = createHistoryStore();
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
