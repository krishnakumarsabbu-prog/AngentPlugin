import { sendRequest, hasVsCodeApi } from "./vscodeApi";
import { demoAgentsStore, demoSkillsStore } from "../data/demoData";
import type {
  Agent,
  AgentExportFormat,
  AgentValidationReport,
  AgentExportResult,
  FullCompatibilityReport,
  PlatformExportResult,
  AgentPlatformId,
  PlatformCompatibility,
  InstallScope,
  InstallTarget,
  InstalledArtifact,
  InstallPlanSummary,
  UninstallSummary,
} from "../types";

export type AgentSortKey = "name" | "updatedAt" | "role" | "version" | "status";

export interface AgentsStore {
  list(): Promise<Agent[]>;
  get(id: string): Promise<Agent>;
  create(input: Partial<Agent>): Promise<Agent>;
  update(id: string, patch: Partial<Agent>): Promise<Agent>;
  duplicate(id: string): Promise<Agent>;
  remove(id: string): Promise<void>;
  validate(agent: Partial<Agent>, id?: string): Promise<AgentValidationReport>;
  exportAgent(format: AgentExportFormat, agent?: Partial<Agent>, id?: string): Promise<AgentExportResult>;
  getCompatibility(agent?: Partial<Agent>, id?: string): Promise<FullCompatibilityReport>;
  exportPlatform(platform: AgentPlatformId, agent?: Partial<Agent>, id?: string): Promise<PlatformExportResult>;
  installTargets(platform: PlatformCompatibility): Promise<{ scope: InstallScope; target: InstallTarget }[]>;
  installPlan(id: string, platform: PlatformCompatibility, scope: InstallScope): Promise<InstallPlanSummary>;
  install(id: string, platform: PlatformCompatibility, scope: InstallScope): Promise<InstalledArtifact>;
  installations(id: string): Promise<InstalledArtifact[]>;
  uninstall(id: string, platform: PlatformCompatibility, scope: InstallScope, removeFromDisk: boolean): Promise<UninstallSummary>;
}

function requireAgent(agent: unknown, context: string): Agent {
  if (!agent || typeof agent !== "object" || typeof (agent as Agent).id !== "string") {
    throw new Error(`${context}: unexpected response shape`);
  }
  return agent as Agent;
}

const hostStore: AgentsStore = {
  async list() {
    const data = await sendRequest<unknown>("agents.list");
    if (!Array.isArray(data)) throw new Error("agents.list: unexpected response shape");
    return data.filter(
      (a): a is Agent => !!a && typeof a === "object" && typeof (a as Agent).id === "string",
    );
  },
  async get(id) {
    return requireAgent(await sendRequest<unknown>("agents.get", { id }), "agents.get");
  },
  async create(input) {
    return requireAgent(await sendRequest<unknown>("agents.create", { agent: input }), "agents.create");
  },
  async update(id, patch) {
    return requireAgent(
      await sendRequest<unknown>("agents.update", { agent: { ...patch, id } }),
      "agents.update",
    );
  },
  async duplicate(id) {
    return requireAgent(await sendRequest<unknown>("agents.duplicate", { id }), "agents.duplicate");
  },
  async remove(id) {
    await sendRequest("agents.delete", { id });
  },
  async validate(agent, id) {
    const res = await sendRequest<AgentValidationReport>("agents.validate", { agent, id });
    return res;
  },
  async exportAgent(format, agent, id) {
    const res = await sendRequest<AgentExportResult>("agents.export", { format, agent, id });
    return res;
  },
  async getCompatibility(agent, id) {
    const res = await sendRequest<FullCompatibilityReport>("agents.compatibility", { agent, id });
    return res;
  },
  async exportPlatform(platform, agent, id) {
    const res = await sendRequest<PlatformExportResult>("agents.exportPlatform", { platform, agent, id });
    return res;
  },
  async installTargets(platform) {
    return sendRequest<{ scope: InstallScope; target: InstallTarget }[]>("agents.installTargets", { platform });
  },
  async installPlan(id, platform, scope) {
    return sendRequest<InstallPlanSummary>("agents.installPlan", { id, platform, scope });
  },
  async install(id, platform, scope) {
    return sendRequest<InstalledArtifact>("agents.install", { id, platform, scope });
  },
  async installations(id) {
    return sendRequest<InstalledArtifact[]>("agents.installations", { id });
  },
  async uninstall(id, platform, scope, removeFromDisk) {
    return sendRequest<UninstallSummary>("agents.uninstall", { id, platform, scope, removeFromDisk });
  },
};

const browserAgentArtifacts = new Map<string, InstalledArtifact[]>();

const browserStore: AgentsStore = {
  async list() {
    return demoAgentsStore.list();
  },
  async get(id) {
    const agent = demoAgentsStore.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);
    return agent;
  },
  async create(input) {
    return demoAgentsStore.create(input);
  },
  async update(id, patch) {
    return demoAgentsStore.update(id, patch);
  },
  async duplicate(id) {
    return demoAgentsStore.duplicate(id);
  },
  async remove(id) {
    demoAgentsStore.remove(id);
  },
  async validate(agent, id) {
    const errors: { severity: "error"; field: string; message: string }[] = [];
    const warnings: { severity: "warning"; field: string; message: string }[] = [];
    const suggestions: { severity: "suggestion"; field: string; message: string }[] = [];

    const name = agent.name?.trim() || "";
    if (!name) errors.push({ severity: "error", field: "name", message: "Agent name is required." });
    const aId = agent.id?.trim() || "";
    if (!aId) errors.push({ severity: "error", field: "id", message: "Agent ID is required." });
    else if (!/^[a-z0-9][a-z0-9-]*$/.test(aId)) {
      errors.push({ severity: "error", field: "id", message: "Agent ID must contain only lowercase letters, digits, and hyphens." });
    }
    const role = agent.role?.trim() || "";
    if (!role) errors.push({ severity: "error", field: "role", message: "Agent role is required." });
    const version = agent.version?.trim() || "";
    if (!version) errors.push({ severity: "error", field: "version", message: "Version is required." });
    const objective = agent.objective?.trim() || "";
    if (!objective) errors.push({ severity: "error", field: "objective", message: "Agent objective is required." });
    const instructions = agent.instructions?.trim() || "";
    if (!instructions) errors.push({ severity: "error", field: "instructions", message: "System instructions are required." });

    // Missing skills
    const knownSkills = new Set(demoSkillsStore.list().map((s) => s.id));
    if (agent.assignedSkillIds) {
      for (const sId of agent.assignedSkillIds) {
        if (!knownSkills.has(sId)) {
          errors.push({ severity: "error", field: "assignedSkillIds", message: `Referenced skill "${sId}" does not exist in skill repository.` });
        }
      }
    }

    // Permission checks
    if (agent.permissionPolicy?.readOnly && agent.permissionPolicy?.writeOperations) {
      errors.push({ severity: "error", field: "permissionPolicy.writeOperations", message: "Contradiction: both read-only and write operations are enabled." });
    }
    if (agent.permissionPolicy?.shell && !agent.permissionPolicy?.humanApprovalRequired) {
      warnings.push({ severity: "warning", field: "permissionPolicy.humanApprovalRequired", message: "Command execution declared without human approval requirement." });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  },
  async exportAgent(format, agent, id) {
    const targetAgent = agent || (id ? demoAgentsStore.get(id) : undefined);
    if (!targetAgent) throw new Error("No agent provided for export");
    const safeId = (targetAgent.id || "agent").toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    let content = "";
    let fileName = "";
    let mimeType = "application/json";

    if (format === "copilot-instructions") {
      fileName = `${safeId}.copilot-instructions.md`;
      mimeType = "text/markdown";
      content = `# ${targetAgent.name || "Agent"}\n\n**Role:** ${targetAgent.role || ""}\n\n## Objective\n${targetAgent.objective || ""}\n\n## Instructions\n${targetAgent.instructions || ""}`;
    } else if (format === "claude-subagent") {
      fileName = `${safeId}.claude-subagent.md`;
      mimeType = "text/markdown";
      content = `<agent id="${targetAgent.id || ""}">\n  <role>${targetAgent.role || ""}</role>\n  <instructions>${targetAgent.instructions || ""}</instructions>\n</agent>`;
    } else if (format === "openai-assistant") {
      fileName = `${safeId}.openai-assistant.json`;
      content = JSON.stringify({ name: targetAgent.name, instructions: targetAgent.instructions, tools: targetAgent.toolDefinitions || [] }, null, 2);
    } else {
      fileName = `${safeId}.agent.json`;
      content = JSON.stringify(targetAgent, null, 2);
    }

    return {
      format,
      fileName,
      mimeType,
      content,
      description: `Agent export for ${format}`,
    };
  },
  async getCompatibility(agent, id) {
    const target = agent || (id ? demoAgentsStore.get(id) : undefined) || {};
    const hasTools = (target.toolDefinitions || []).length > 0;
    return {
      matrix: [],
      platformAnalysis: {
        copilot: {
          platformName: "GitHub Copilot",
          supportLevel: hasTools ? "partial" : "native",
          isExperimental: false,
          warnings: hasTools ? ["Tools are not executed at runtime in Copilot instructions."] : [],
          fieldSupport: [],
          limitations: [
            {
              title: "No Runtime Tool Execution",
              description: "GitHub Copilot instructions (.github/copilot-instructions.md) do not natively bind runtime tools.",
              impact: "high",
            },
          ],
          suggestedDestination: ".github/copilot-instructions.md",
        },
        claude: {
          platformName: "Claude / Claude Code",
          supportLevel: "native",
          isExperimental: false,
          warnings: [],
          fieldSupport: [],
          limitations: [],
          suggestedDestination: "CLAUDE.md",
        },
        openai: {
          platformName: "OpenAI API / Assistants",
          supportLevel: "simulated",
          isExperimental: true,
          warnings: ["Simulated adapter: generates schema without API credentials."],
          fieldSupport: [],
          limitations: [
            {
              title: "Client-side Execution Loop Required",
              description: "OpenAI calls return function requests; host executes actual tools.",
              impact: "high",
            },
          ],
          suggestedDestination: ".agentforge/export/openai/{id}-assistant.json",
        },
        neutral: {
          platformName: "AgentForge Canonical",
          supportLevel: "native",
          isExperimental: false,
          warnings: [],
          fieldSupport: [],
          limitations: [],
          suggestedDestination: ".agentforge/agents/{id}.json",
        },
      },
    };
  },
  async exportPlatform(platform, agent, id) {
    const target = agent || (id ? demoAgentsStore.get(id) : undefined) || {};
    const safeId = (target.id || "agent").toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    if (platform === "copilot") {
      const content = `# ${target.name || "Agent"}\n\n**Role:** ${target.role || ""}\n\n## Objective\n${target.objective || ""}\n\n## Instructions\n${target.instructions || ""}`;
      return {
        platformId: "copilot",
        platformName: "GitHub Copilot",
        supportLevel: (target.toolDefinitions || []).length > 0 ? "partial" : "native",
        exportFormat: "Markdown (.github/copilot-instructions.md)",
        files: [{ relativePath: ".github/copilot-instructions.md", fileName: "copilot-instructions.md", mimeType: "text/markdown", content, purpose: "Copilot instructions" }],
        destination: { scope: "workspace", suggestedRelativePath: ".github/copilot-instructions.md", displayTarget: ".github/copilot-instructions.md", ruleDescription: "Workspace root instructions" },
        warnings: (target.toolDefinitions || []).length > 0 ? ["Tools are documented textually only."] : [],
        limitations: [],
        supportedFields: ["name", "role", "instructions", "objective"],
        unsupportedFields: ["toolDefinitions"],
        isSimulatedOrExperimental: false,
        statusDisclaimer: "Configures Copilot workspace instructions.",
      };
    } else if (platform === "claude") {
      const content = `# ${target.name || "Agent"}\n\n## Instructions\n${target.instructions || ""}`;
      return {
        platformId: "claude",
        platformName: "Claude / Claude Code",
        supportLevel: "native",
        exportFormat: "CLAUDE.md Bundle",
        files: [{ relativePath: "CLAUDE.md", fileName: "CLAUDE.md", mimeType: "text/markdown", content, purpose: "Claude project instructions" }],
        destination: { scope: "workspace", suggestedRelativePath: "CLAUDE.md", displayTarget: "CLAUDE.md", ruleDescription: "Workspace root instructions" },
        warnings: [],
        limitations: [],
        supportedFields: ["all"],
        unsupportedFields: [],
        isSimulatedOrExperimental: false,
        statusDisclaimer: "Configures Claude workspace guidance and tools.",
      };
    } else if (platform === "openai") {
      const content = JSON.stringify({ name: target.name, instructions: target.instructions, tools: target.toolDefinitions || [] }, null, 2);
      return {
        platformId: "openai",
        platformName: "OpenAI Assistants",
        supportLevel: "simulated",
        exportFormat: "OpenAI Assistant Schema (JSON)",
        files: [{ relativePath: `.agentforge/export/openai/${safeId}-assistant.json`, fileName: `${safeId}-assistant.json`, mimeType: "application/json", content, purpose: "OpenAI assistant payload" }],
        destination: { scope: "cloud-api", suggestedRelativePath: `.agentforge/export/openai/${safeId}-assistant.json`, displayTarget: "OpenAI API Endpoint", ruleDescription: "Simulated export file" },
        warnings: ["Simulated adapter: generates schema without API credentials."],
        limitations: [],
        supportedFields: ["name", "instructions", "tools"],
        unsupportedFields: ["permissionPolicy"],
        isSimulatedOrExperimental: true,
        statusDisclaimer: "Simulated export: credentials not required in this phase.",
      };
    } else {
      const content = JSON.stringify(target, null, 2);
      return {
        platformId: "neutral",
        platformName: "AgentForge Canonical",
        supportLevel: "native",
        exportFormat: "Canonical JSON",
        files: [{ relativePath: `.agentforge/agents/${safeId}.json`, fileName: `${safeId}.json`, mimeType: "application/json", content, purpose: "Canonical specification" }],
        destination: { scope: "workspace", suggestedRelativePath: `.agentforge/agents/${safeId}.json`, displayTarget: `.agentforge/agents/${safeId}.json`, ruleDescription: "Workspace storage" },
        warnings: [],
        limitations: [],
        supportedFields: ["all"],
        unsupportedFields: [],
        isSimulatedOrExperimental: false,
        statusDisclaimer: "Canonical specification.",
      };
    }
  },
  async installTargets(platform) {
    const targets: { scope: InstallScope; target: InstallTarget }[] = [
      {
        scope: "workspace",
        target: {
          platform,
          scope: "workspace",
          root: `<workspace>/.agents/agents`,
          displayPath: `<workspace>/.agents/agents`,
        },
      },
    ];
    return targets;
  },
  async installPlan(id, platform, scope) {
    const agent = demoAgentsStore.get(id);
    const safeId = (agent?.id || id).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const ext = platform === "copilot" || platform === "claude" ? "md" : "json";
    return {
      target: {
        platform,
        scope,
        root: `<workspace>/.agents/agents`,
        displayPath: `<workspace>/.agents/agents`,
      },
      files: [`${safeId}.${ext}`],
      existing: [],
      supported: true,
      simulated: false,
    };
  },
  async install(id, platform, scope) {
    const agent = demoAgentsStore.get(id);
    const safeId = (agent?.id || id).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const ext = platform === "copilot" || platform === "claude" ? "md" : "json";
    const artifact: InstalledArtifact = {
      platform,
      scope,
      root: `<workspace>/.agents/agents`,
      files: [`${safeId}.${ext}`],
      installedAt: new Date().toISOString(),
      simulated: false,
    };
    const list = browserAgentArtifacts.get(id) ?? [];
    const idx = list.findIndex((a) => a.platform === platform && a.scope === scope);
    if (idx >= 0) list[idx] = artifact;
    else list.push(artifact);
    browserAgentArtifacts.set(id, list);
    return artifact;
  },
  async installations(id) {
    return browserAgentArtifacts.get(id) ?? [];
  },
  async uninstall(id, platform, scope, removeFromDisk) {
    const list = browserAgentArtifacts.get(id) ?? [];
    const idx = list.findIndex((a) => a.platform === platform && a.scope === scope);
    if (idx >= 0) list.splice(idx, 1);
    browserAgentArtifacts.set(id, list);
    return {
      recordRemoved: true,
      diskRemoved: removeFromDisk,
      simulated: false,
      message: `Removed AgentForge installation record for ${platform} (${scope}).`,
    };
  },
};

export function getAgentsStore(): AgentsStore {
  return hasVsCodeApi() ? hostStore : browserStore;
}

export interface AgentBatchInstallResult {
  ok: boolean;
  platform: string;
  count: number;
  results?: any[];
}

export async function installAgent(
  id: string,
  platform: "copilot" | "claude" | "openai" | "neutral",
  scope: "workspace" | "user" = "workspace"
): Promise<any> {
  if (hasVsCodeApi()) {
    return sendRequest<any>("agents.install", { id, platform, scope, installRelatedSkills: true });
  }
  return { ok: true, platform, simulated: true };
}

export async function batchInstallAgents(
  ids: string[],
  platform: "copilot" | "claude" | "openai" | "neutral",
  scope: "workspace" | "user" = "workspace"
): Promise<AgentBatchInstallResult> {
  if (hasVsCodeApi()) {
    return sendRequest<AgentBatchInstallResult>("agents.batchInstall", {
      ids,
      platform,
      scope,
      installRelatedSkills: true,
    });
  }
  return { ok: true, platform, count: ids.length, results: [] };
}
