import { CapabilityMatrixRow, AgentPlatformId, CompatibilitySupportLevel } from "./types";

export const CAPABILITY_MATRIX: CapabilityMatrixRow[] = [
  // 1. Identity & Mission
  {
    capabilityId: "system_instructions",
    capabilityName: "System Instructions & Prompt Directives",
    category: "Identity & Mission",
    description: "Ability to ingest overarching instructions, operational scope, and personas.",
    platforms: {
      copilot: {
        supportLevel: "native",
        notes: "Markdown instructions ingested via .github/copilot-instructions.md.",
      },
      claude: {
        supportLevel: "native",
        notes: "Native system prompt and CLAUDE.md project knowledge instructions.",
      },
      openai: {
        supportLevel: "native",
        notes: "Native instructions field in Assistant API and ChatCompletions system message.",
      },
      neutral: {
        supportLevel: "native",
        notes: "Canonical markdown/text representation.",
      },
    },
  },
  {
    capabilityId: "role_definition",
    capabilityName: "Role Persona & Identity Boundaries",
    category: "Identity & Mission",
    description: "Explicit role definitions (e.g. Software Architect, Quality Assurance Engineer).",
    platforms: {
      copilot: {
        supportLevel: "partial",
        notes: "Documented within instructions; no discrete role attribute in Copilot.",
      },
      claude: {
        supportLevel: "native",
        notes: "Represented via explicit XML/Markdown <role> tags and prompt persona.",
      },
      openai: {
        supportLevel: "partial",
        notes: "Prefixed to instructions; assistant 'name' is supported but role is text-only.",
      },
      neutral: {
        supportLevel: "native",
        notes: "Explicit top-level canonical 'role' field.",
      },
    },
  },
  {
    capabilityId: "operating_principles",
    capabilityName: "Operating Principles & Guardrails",
    category: "Identity & Mission",
    description: "Structured rules and behavioral axioms that govern decision making.",
    platforms: {
      copilot: {
        supportLevel: "native",
        notes: "Rendered as prioritized Markdown bullet list under '## Operating Principles'.",
      },
      claude: {
        supportLevel: "native",
        notes: "Rendered within <operating_principles> XML blocks.",
      },
      openai: {
        supportLevel: "partial",
        notes: "Appended to instructions block text.",
      },
      neutral: {
        supportLevel: "native",
        notes: "Structured array of string principles.",
      },
    },
  },

  // 2. Skills & Tools
  {
    capabilityId: "assigned_skills",
    capabilityName: "Assigned Skills Bundle Reference",
    category: "Skills & Tools",
    description: "Referencing and chaining modular skill packages created in AgentForge.",
    platforms: {
      copilot: {
        supportLevel: "partial",
        notes: "Referenced textually in copilot-instructions.md; skill files must reside in workspace.",
      },
      claude: {
        supportLevel: "native",
        notes: "Referenced in CLAUDE.md or project files; Claude Code reads workspace skill files.",
      },
      openai: {
        supportLevel: "partial",
        notes: "Skill instructions consolidated into single assistant instructions payload.",
      },
      neutral: {
        supportLevel: "native",
        notes: "Canonical assignedSkillIds list referencing registered skills.",
      },
    },
  },
  {
    capabilityId: "declarative_tools",
    capabilityName: "Declarative Function Tools",
    category: "Skills & Tools",
    description: "Structured tool definitions with schemas, purpose, and required permissions.",
    platforms: {
      copilot: {
        supportLevel: "unsupported",
        notes: "Copilot workspace instructions do not support declarative function invocation schemas. Tools are documented as reference only.",
      },
      claude: {
        supportLevel: "native",
        notes: "Mapped to Claude tool use format with input_schema and tool descriptions.",
      },
      openai: {
        supportLevel: "native",
        notes: "Mapped to tools array with type: 'function' and parameters schema.",
      },
      neutral: {
        supportLevel: "native",
        notes: "Full declarative toolDefinitions array.",
      },
    },
  },

  // 3. Governance & Safety
  {
    capabilityId: "permission_guardrails",
    capabilityName: "Permission Policies & Least-Privilege Enforcing",
    category: "Governance & Safety",
    description: "Enforcing read-only access, workspace confinement, shell and network barriers.",
    platforms: {
      copilot: {
        supportLevel: "partial",
        notes: "Advisory text instructions only; Copilot has no deterministic permission sandbox.",
      },
      claude: {
        supportLevel: "partial",
        notes: "Claude Code prompts for tool approvals; permissions guide tool approval heuristics.",
      },
      openai: {
        supportLevel: "simulated",
        notes: "OpenAI API has no local machine sandbox; caller client must enforce permissions during tool execution loop.",
      },
      neutral: {
        supportLevel: "native",
        notes: "Canonical PermissionPolicy object with strict guardrail flags.",
      },
    },
  },
  {
    capabilityId: "restricted_paths",
    capabilityName: "Restricted Paths Denylist (.git, .env)",
    category: "Governance & Safety",
    description: "Explicit path patterns forbidden from agent reading or modification.",
    platforms: {
      copilot: {
        supportLevel: "partial",
        notes: "Documented as forbidden paths in markdown instructions.",
      },
      claude: {
        supportLevel: "partial",
        notes: "Configured in CLAUDE.md ignore directives.",
      },
      openai: {
        supportLevel: "simulated",
        notes: "Handled by caller application when servicing function tool requests.",
      },
      neutral: {
        supportLevel: "native",
        notes: "Array of restricted path globs.",
      },
    },
  },

  // 4. Contracts & Runtime
  {
    capabilityId: "input_output_schemas",
    capabilityName: "Runtime Input & Output JSON Schemas",
    category: "Contracts & Runtime",
    description: "Enforcing deterministic JSON Schema input constraints and structured responses.",
    platforms: {
      copilot: {
        supportLevel: "unsupported",
        notes: "Copilot does not validate JSON Schema at runtime. Schema is included as descriptive markdown.",
      },
      claude: {
        supportLevel: "partial",
        notes: "Claude supports tool input schemas and structured JSON prompting, but does not natively enforce top-level I/O schemas without wrapper harness.",
      },
      openai: {
        supportLevel: "partial",
        notes: "Supports function call parameter schemas and response_format: { type: 'json_object' }.",
      },
      neutral: {
        supportLevel: "native",
        notes: "Canonical inputSchema and outputSchema JsonSchema objects.",
      },
    },
  },
  {
    capabilityId: "direct_workspace_install",
    capabilityName: "Direct Workspace Installation",
    category: "Contracts & Runtime",
    description: "Installing configuration artifacts directly into the project repository.",
    platforms: {
      copilot: {
        supportLevel: "native",
        notes: "Direct install to .github/copilot-instructions.md in workspace.",
      },
      claude: {
        supportLevel: "native",
        notes: "Direct install to CLAUDE.md or .claude/ directory in workspace.",
      },
      openai: {
        supportLevel: "simulated",
        notes: "OpenAI API is a cloud endpoint; local install writes export JSON ready for sync/upload.",
      },
      neutral: {
        supportLevel: "native",
        notes: "Installed as local .agentforge/agents/<id>.json specification.",
      },
    },
  },
];
