import {
  Play,
  FileText,
  Sparkles,
  Bot,
  CalendarDays,
  UserCheck,
  GitBranch,
  ArrowRightLeft,
  Split,
  GitMerge,
  ShieldCheck,
  RotateCcw,
  PackageCheck,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import type { WorkflowNodeType } from "../../types";

export interface NodeDefinition {
  type: WorkflowNodeType;
  label: string;
  category: "Control Flow" | "Input & Output" | "Cognitive & Skills" | "Governance & Safety";
  description: string;
  defaultName: string;
  icon: LucideIcon;
  color: string;
  bgLight: string;
  borderLight: string;
  hasInput: boolean;
  hasOutput: boolean;
  defaultConfig: Record<string, unknown>;
}

export const VALID_CONDITION_TYPES = [
  "expression",
  "field_match",
  "status_check",
  "threshold",
] as const;

export type ValidConditionType = (typeof VALID_CONDITION_TYPES)[number];

export const NODE_DEFINITIONS: Record<string, NodeDefinition> = {
  start: {
    type: "start",
    label: "Start",
    category: "Control Flow",
    description: "Pipeline entry trigger and initialization point.",
    defaultName: "Start",
    icon: Play,
    color: "#059669",
    bgLight: "#ECFDF5",
    borderLight: "#A7F3D0",
    hasInput: false,
    hasOutput: true,
    defaultConfig: { trigger: "manual" },
  },
  requirement_input: {
    type: "requirement_input",
    label: "Requirement Input",
    category: "Input & Output",
    description: "Accepts specifications, user stories, and prompt criteria.",
    defaultName: "Requirement Intake",
    icon: FileText,
    color: "#0284C7",
    bgLight: "#F0F9FF",
    borderLight: "#BAE6FD",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { intakeFormat: "markdown", source: "User Story" },
  },
  skill_invocation: {
    type: "skill_invocation",
    label: "Skill Invocation",
    category: "Cognitive & Skills",
    description: "Executes a reusable prompt skill or deterministic utility.",
    defaultName: "Skill Invocation",
    icon: Sparkles,
    color: "#7C3AED",
    bgLight: "#F5F3FF",
    borderLight: "#DDD6FE",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { skillId: "" },
  },
  agent_execution: {
    type: "agent_execution",
    label: "Agent Execution",
    category: "Cognitive & Skills",
    description: "Delegates goal execution to an autonomous specialized agent.",
    defaultName: "Agent Execution",
    icon: Bot,
    color: "#4F46E5",
    bgLight: "#EEF2FF",
    borderLight: "#C7D2FE",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { agentId: "", role: "Worker" },
  },
  planning: {
    type: "planning",
    label: "Planning",
    category: "Cognitive & Skills",
    description: "Generates multi-step execution plans and milestones.",
    defaultName: "Planning Agent",
    icon: CalendarDays,
    color: "#2563EB",
    bgLight: "#EFF6FF",
    borderLight: "#BFDBFE",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { agentId: "agent-planning", role: "Planning Specialist" },
  },
  human_approval: {
    type: "human_approval",
    label: "Human Approval",
    category: "Governance & Safety",
    description: "Governance checkpoint requiring human review and sign-off.",
    defaultName: "Human Plan Approval",
    icon: UserCheck,
    color: "#D97706",
    bgLight: "#FFFBEB",
    borderLight: "#FDE68A",
    hasInput: true,
    hasOutput: true,
    defaultConfig: {
      approverRole: "Engineering Lead / Tech Lead",
      approvalMessage: "Please review and approve the task deliverables before continuing.",
      whatIsBeingApproved: "Plan deliverables and execution outcome",
      timeoutMinutes: 60,
      onApprove: "proceed",
      onReject: "halt",
    },
  },
  condition_branch: {
    type: "condition_branch",
    label: "Condition / Branch",
    category: "Control Flow",
    description: "Evaluates expressions to branch flow into distinct paths.",
    defaultName: "Condition / Branch",
    icon: GitBranch,
    color: "#9333EA",
    bgLight: "#FAF5FF",
    borderLight: "#E9D5FF",
    hasInput: true,
    hasOutput: true,
    defaultConfig: {
      conditionType: "expression",
      conditionExpression: "outcome.success == true",
      branches: ["true", "false"],
    },
  },
  context_handoff: {
    type: "context_handoff",
    label: "Context Handoff",
    category: "Input & Output",
    description: "Transforms and filters context between agent boundaries.",
    defaultName: "Context Handoff",
    icon: ArrowRightLeft,
    color: "#0891B2",
    bgLight: "#ECFEFF",
    borderLight: "#A5F3FC",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { includeMemory: true, forwardFields: [], forwardArtifacts: [] },
  },
  parallel_execution: {
    type: "parallel_execution",
    label: "Parallel Execution",
    category: "Control Flow",
    description: "Forks execution across concurrent agent paths simultaneously.",
    defaultName: "Parallel Execution",
    icon: Split,
    color: "#C026D3",
    bgLight: "#FDF4FF",
    borderLight: "#F5D0FE",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { maxConcurrency: 3 },
  },
  merge_results: {
    type: "merge_results",
    label: "Merge Results",
    category: "Control Flow",
    description: "Waits for and joins multiple concurrent branch outputs.",
    defaultName: "Merge Results",
    icon: GitMerge,
    color: "#DB2777",
    bgLight: "#FDF2F8",
    borderLight: "#FBCFE8",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { strategy: "combine_all" },
  },
  validation: {
    type: "validation",
    label: "Validation",
    category: "Governance & Safety",
    description: "Asserts quality gates, contract schemas, or automated tests.",
    defaultName: "Test Validation Agent",
    icon: ShieldCheck,
    color: "#16A34A",
    bgLight: "#F0FDF4",
    borderLight: "#BBF7D0",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { assertion: "All tests must pass", failurePolicy: "stop" },
  },
  retry: {
    type: "retry",
    label: "Retry",
    category: "Governance & Safety",
    description: "Configures automatic retry loops on node or execution failure.",
    defaultName: "Retry",
    icon: RotateCcw,
    color: "#EA580C",
    bgLight: "#FFF7ED",
    borderLight: "#FED7AA",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { maxRetries: 3, backoffSeconds: 5 },
  },
  artifact_output: {
    type: "artifact_output",
    label: "Artifact Output",
    category: "Input & Output",
    description: "Packages and exports deliverables (code diffs, documents, reports).",
    defaultName: "Final Artifact Output",
    icon: PackageCheck,
    color: "#2563EB",
    bgLight: "#EFF6FF",
    borderLight: "#BFDBFE",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { artifactPath: "dist/release-bundle.json", publishTarget: "Repository" },
  },
  end: {
    type: "end",
    label: "End",
    category: "Control Flow",
    description: "Terminal completion node for the pipeline.",
    defaultName: "End",
    icon: CheckCircle2,
    color: "#475569",
    bgLight: "#F8FAFC",
    borderLight: "#CBD5E1",
    hasInput: true,
    hasOutput: false,
    defaultConfig: {},
  },
};

// Aliases for legacy node types
NODE_DEFINITIONS.agent = {
  ...NODE_DEFINITIONS.agent_execution,
  label: "Agent (Legacy)",
};
NODE_DEFINITIONS.skill = {
  ...NODE_DEFINITIONS.skill_invocation,
  label: "Skill (Legacy)",
};
NODE_DEFINITIONS.input = {
  ...NODE_DEFINITIONS.requirement_input,
  label: "Input (Legacy)",
};
NODE_DEFINITIONS.output = {
  ...NODE_DEFINITIONS.artifact_output,
  label: "Output (Legacy)",
};
NODE_DEFINITIONS.approval = {
  ...NODE_DEFINITIONS.human_approval,
  label: "Approval (Legacy)",
};
NODE_DEFINITIONS.handoff = {
  ...NODE_DEFINITIONS.context_handoff,
  label: "Handoff (Legacy)",
};
NODE_DEFINITIONS.decision = {
  ...NODE_DEFINITIONS.condition_branch,
  label: "Decision (Legacy)",
};

export const PALETTE_CATEGORIES = [
  "Control Flow",
  "Input & Output",
  "Cognitive & Skills",
  "Governance & Safety",
] as const;

export function getNodeDefinition(type: string): NodeDefinition {
  return (
    NODE_DEFINITIONS[type] || {
      type: type as WorkflowNodeType,
      label: type,
      category: "Cognitive & Skills",
      description: "Custom pipeline node.",
      defaultName: type,
      icon: Bot,
      color: "#64748B",
      bgLight: "#F1F5F9",
      borderLight: "#CBD5E1",
      hasInput: true,
      hasOutput: true,
      defaultConfig: {},
    }
  );
}
