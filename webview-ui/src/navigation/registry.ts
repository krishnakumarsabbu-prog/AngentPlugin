import {
  LayoutDashboard,
  Sparkles,
  Bot,
  Workflow,
  History,
  FlaskConical,
  GitCompareArrows,
  Plug,
  Package,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
  description: string;
  future: string[];
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        group: "Overview",
        description: "Platform overview and recent activity.",
        future: [],
      },
    ],
  },
  {
    label: "Engineering Studio",
    items: [
      {
        id: "skills-studio",
        label: "Skills Studio",
        icon: Sparkles,
        group: "Engineering Studio",
        description: "Author, validate, version, and manage reusable AI skills.",
        future: [
          "SKILL.md editing with live preview",
          "Validation and linting",
          "Skill testing sandbox",
          "Versioning and history",
          "Import and export",
          "Installation and removal",
        ],
      },
      {
        id: "agent-studio",
        label: "Agent Studio",
        icon: Bot,
        group: "Engineering Studio",
        description: "Build specialized agents, assign skills, and configure permissions.",
        future: [
          "Visual Agent Builder",
          "Skill assignments",
          "Tool definitions",
          "Permission configuration",
          "Input/output schemas",
          "Platform-specific exports",
        ],
      },
      {
        id: "harness-pipeline",
        label: "Harness Pipeline",
        icon: Workflow,
        group: "Engineering Studio",
        description: "Design multi-agent workflows with context handoffs and approval gates.",
        future: [
          "Drag-and-drop editor (xyflow)",
          "Independent agent steps",
          "Input/output contracts",
          "Context handoffs",
          "Approval gates and retry policies",
          "Validation, simulation, and execution history",
        ],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        id: "execution-history",
        label: "Execution History",
        icon: History,
        group: "Operations",
        description: "Inspect pipeline runs and node-level execution details.",
        future: ["Run inspector", "Node-level logs", "Re-run and cancel", "Filtering and search"],
      },
      {
        id: "test-evaluation",
        label: "Test & Evaluation",
        icon: FlaskConical,
        group: "Operations",
        description: "Evaluate skills and agents against curated test suites.",
        future: ["Test suites", "Evaluation runs", "Scorecards", "Regression tracking"],
      },
      {
        id: "pipeline-comparison",
        label: "Pipeline Comparison",
        icon: GitCompareArrows,
        group: "Operations",
        description: "Compare pipeline configurations and execution outcomes.",
        future: ["Side-by-side diff", "Metric comparison", "Run selection"],
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        id: "platform-integrations",
        label: "Platform Integrations",
        icon: Plug,
        group: "Platform",
        description: "Connect and export to GitHub Copilot, Claude, and OpenAI-based targets.",
        future: ["Adapter configuration", "Capability matrix", "Export profiles", "Connection health"],
      },
      {
        id: "package-manager",
        label: "Package Manager",
        icon: Package,
        group: "Platform",
        description: "Install, update, and publish skill and agent packages.",
        future: ["Package registry", "Dependency resolution", "Publish workflow", "Lock files"],
      },
    ],
  },
  {
    label: "Governance",
    items: [
      {
        id: "governance-audit",
        label: "Governance & Audit",
        icon: ShieldCheck,
        group: "Governance",
        description: "Audit records, permission policies, and change history.",
        future: ["Audit log", "Policy editor", "Change history", "Retention controls"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        id: "settings",
        label: "Settings",
        icon: Settings,
        group: "Administration",
        description: "Application preferences and platform defaults.",
        future: ["Theme and density", "Default platform", "Telemetry controls", "Reset demo data"],
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function findNavItem(id: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((i) => i.id === id);
}
