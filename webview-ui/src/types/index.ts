export type SkillStatus = "Draft" | "Ready" | "Deprecated";
export type PlatformCompatibility = "copilot" | "claude" | "openai" | "neutral";
export type InstallationState = "not-installed" | "installed" | "outdated";
export type AgentStatus = "Draft" | "Ready" | "Experimental";
export type WorkflowStatus = "Draft" | "Ready" | "Active";
export type ExecutionStatus =
  | "Validating"
  | "Ready"
  | "Running"
  | "Waiting for Approval"
  | "Succeeded"
  | "Failed"
  | "Cancelled"
  | "Pending";

export type NodeExecutionStatus =
  | "Pending"
  | "Running"
  | "Waiting for Approval"
  | "Succeeded"
  | "Failed"
  | "Skipped"
  | "Cancelled";

export interface ArtifactReference {
  id: string;
  name: string;
  type: string;
  uri?: string;
  summary: string;
  producedByNodeId: string;
  createdAt: string;
  isSimulated: boolean;
}

export interface RetryAttemptRecord {
  attemptNumber: number;
  timestamp: string;
  error: string;
  backoffSeconds: number;
  succeeded: boolean;
}

export interface FailureDetails {
  hasFailed: boolean;
  reason?: string;
  error?: string;
  retryCount?: number;
  retriesExhausted?: boolean;
}

export interface ContextHandoffRecord {
  id: string;
  runId: string;
  sourceNodeId: string;
  sourceNodeName: string;
  destinationNodeId: string;
  destinationNodeName: string;
  taskSummary: string;
  priorFindings: Record<string, unknown> | string[];
  selectedArtifacts: ArtifactReference[];
  constraints: string[];
  expectedOutputSchema?: Record<string, unknown>;
  completionCriteria: string[];
  failureDetails?: FailureDetails;
  timestamp: string;
  isSimulated: boolean;
}

export interface NodeExecution {
  nodeId: string;
  nodeName?: string;
  nodeType?: string;
  status: NodeExecutionStatus | ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  summary?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
  retryCount?: number;
  retries?: RetryAttemptRecord[];
  isSimulated?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  approvalDecisionBy?: string;
  approvalComment?: string;
  approvalMessage?: string;
  whatIsBeingApproved?: string;
  selectedBranch?: string;
  handoffsIn?: ContextHandoffRecord[];
  handoffsOut?: ContextHandoffRecord[];
  validation?: { passed: boolean; message?: string; details?: unknown };
}

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  workflowName?: string;
  workflowVersion: string;
  workflowSnapshot?: Workflow;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  triggerType?: string;
  totalSteps?: number;
  failedSteps?: number;
  nodeExecutions: NodeExecution[];
  artifacts?: ArtifactReference[];
  contextData?: Record<string, unknown>;
  handoffs?: ContextHandoffRecord[];
  finalSummary?: string;
  error?: string;
  isSimulated: boolean;
  currentWaitingNodeId?: string;
}

export type IntegrationState = "Not Connected" | "Mock" | "Connected";

export interface SkillResource {
  id: string;
  name: string;
  kind: "file" | "script" | "template" | "reference" | "example" | "test";
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  instructions: string;
  frontmatter: string;
  resources: SkillResource[];
  compatibility: PlatformCompatibility[];
  otherTargets: string[];
  requiredTools: string[];
  permissions: string[];
  changelog: string;
  requirements: string;
  status: SkillStatus;
  installationState: InstallationState;
  createdAt: string;
  updatedAt: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  schema?: Record<string, unknown>;
  purpose?: string;
  availability?: "always" | "on-demand" | "conditional";
  requiredPermissions?: string[];
}

export interface PermissionPolicy {
  network: boolean;
  fileSystem: "none" | "read" | "readwrite";
  shell: boolean;
  maxTokens: number;
  readOnly?: boolean;
  workspaceAccess?: boolean;
  writeOperations?: boolean;
  restrictedPaths?: string[];
  humanApprovalRequired?: boolean;
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
}

export interface TestScenario {
  id: string;
  name: string;
  description?: string;
  inputPayload?: string | Record<string, unknown>;
  expectedOutcome?: string;
  lastEvaluationResult?: {
    passed: boolean;
    score: number;
    notes: string;
    evaluatedAt: string;
  };
}

export type AgentExportFormat =
  | "agent-spec"
  | "copilot-instructions"
  | "claude-subagent"
  | "openai-assistant";

export interface Agent {
  id: string;
  name: string;
  description: string;
  category?: string;
  role: string;
  objective: string;
  instructions: string;
  scope?: string;
  outOfScope?: string;
  operatingPrinciples?: string[];
  assignedSkillIds: string[];
  toolDefinitions?: ToolDefinition[];
  permissionPolicy?: PermissionPolicy;
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
  exampleInput?: string | Record<string, unknown>;
  exampleOutput?: string | Record<string, unknown>;
  compatibility?: PlatformCompatibility[];
  exportFormat?: AgentExportFormat;
  testScenarios?: TestScenario[];
  version: string;
  status: AgentStatus;
  changelog?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentValidationFinding {
  severity: "error" | "warning" | "suggestion";
  field: string;
  message: string;
}

export interface AgentValidationReport {
  valid: boolean;
  errors: AgentValidationFinding[];
  warnings: AgentValidationFinding[];
  suggestions: AgentValidationFinding[];
}

export interface AgentExportResult {
  format: AgentExportFormat;
  fileName: string;
  mimeType: string;
  content: string;
  description: string;
}

export type AgentPlatformId = "copilot" | "claude" | "openai" | "neutral";
export type CompatibilitySupportLevel = "native" | "partial" | "simulated" | "unsupported";

export interface PlatformFieldSupport {
  field: string;
  supportLevel: CompatibilitySupportLevel;
  notes: string;
}

export interface PlatformKnownLimitation {
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  mitigation?: string;
}

export interface PlatformInstallDestination {
  scope: "workspace" | "user" | "cloud-api";
  suggestedRelativePath: string;
  displayTarget: string;
  ruleDescription: string;
}

export interface ExportArtifactFile {
  relativePath: string;
  fileName: string;
  mimeType: string;
  content: string;
  purpose: string;
}

export interface PlatformExportResult {
  platformId: AgentPlatformId;
  platformName: string;
  supportLevel: CompatibilitySupportLevel;
  exportFormat: string;
  files: ExportArtifactFile[];
  destination: PlatformInstallDestination;
  warnings: string[];
  limitations: PlatformKnownLimitation[];
  supportedFields: string[];
  unsupportedFields: string[];
  isSimulatedOrExperimental: boolean;
  statusDisclaimer: string;
}

export interface CapabilityMatrixRow {
  capabilityId: string;
  capabilityName: string;
  category: "Identity & Mission" | "Skills & Tools" | "Governance & Safety" | "Contracts & Runtime";
  description: string;
  platforms: Record<AgentPlatformId, {
    supportLevel: CompatibilitySupportLevel;
    notes: string;
  }>;
}

export interface FullCompatibilityReport {
  matrix: CapabilityMatrixRow[];
  platformAnalysis: Record<
    AgentPlatformId,
    {
      platformName: string;
      supportLevel: CompatibilitySupportLevel;
      isExperimental: boolean;
      warnings: string[];
      fieldSupport: PlatformFieldSupport[];
      limitations: PlatformKnownLimitation[];
      suggestedDestination: string;
    }
  >;
}

export type WorkflowNodeType =
  | "start"
  | "requirement_input"
  | "skill_invocation"
  | "agent_execution"
  | "planning"
  | "human_approval"
  | "condition_branch"
  | "context_handoff"
  | "parallel_execution"
  | "merge_results"
  | "validation"
  | "retry"
  | "artifact_output"
  | "end"
  | "agent"
  | "skill"
  | "input"
  | "output"
  | "approval"
  | "handoff"
  | "decision";

export interface NodeRetryPolicy {
  enabled: boolean;
  maxRetries: number;
  backoffSeconds: number;
  retryOnErrors?: string[];
}

export interface NodeApprovalPolicy {
  required: boolean;
  approverRole?: string;
  timeoutMinutes?: number;
  message?: string;
  whatIsBeingApproved?: string;
  onApprove?: "proceed" | "proceed_with_notes";
  onReject?: "halt" | "route_to_fallback" | "request_revision";
  fallbackNodeId?: string;
}

export interface NodeErrorHandling {
  action: "halt" | "continue_with_warning" | "route_to_fallback" | "retry";
  fallbackNodeId?: string;
  customErrorMessage?: string;
  logLevel?: "error" | "warn" | "info";
}

export interface NodeContractSchema {
  schema: Record<string, unknown>;
  requiredFields?: string[];
  description?: string;
  examplePayload?: string | Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  description?: string;
  configuration: Record<string, unknown>;
  inputContract?: NodeContractSchema;
  outputContract?: NodeContractSchema;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  timeoutSeconds?: number;
  retryPolicy?: NodeRetryPolicy;
  approvalPolicy?: NodeApprovalPolicy;
  errorHandling?: NodeErrorHandling;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface ExecutionSettings {
  maxParallelNodes: number;
  retryPolicy: {
    maxRetries: number;
    backoffSeconds: number;
  };
  requireApprovalFor: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  executionSettings: ExecutionSettings;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  version: string;
  nodeCount: number;
  updatedAt: string;
}

export interface WorkflowValidationFinding {
  severity: "error" | "warning" | "suggestion";
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export interface WorkflowValidationReport {
  valid: boolean;
  errors: WorkflowValidationFinding[];
  warnings: WorkflowValidationFinding[];
  suggestions: WorkflowValidationFinding[];
}


export interface IntegrationStatus {
  id: string;
  name: string;
  kind: "copilot" | "claude" | "openai";
  status: IntegrationState;
  description: string;
}

export interface ActivityEntry {
  id: string;
  kind: "skill" | "agent" | "workflow" | "execution" | "system";
  label: string;
  timestamp: string;
  status?: string;
}

export interface DashboardData {
  metrics: {
    totalSkills: number;
    totalAgents: number;
    totalPipelines: number;
    pipelineRuns: number;
    successfulRuns: number;
    failedRuns: number;
    installedPackages: number;
  };
  recentActivity: ActivityEntry[];
  recentSkills: Skill[];
  recentAgents: Agent[];
  recentExecutions: ExecutionRecord[];
  integrations: IntegrationStatus[];
}

export interface AppSettings {
  schemaVersion: number;
  theme: "light";
  defaultPlatform: "copilot" | "claude" | "openai" | "neutral";
  telemetry: boolean;
  autoSave: boolean;
  recentRoute: string;
  defaultStartPage?: string;
  confirmDestructiveActions?: boolean;
  skillExportPreferences?: {
    format: "markdown" | "json" | "yaml";
    includeMetadata: boolean;
    prettyPrint: boolean;
  };
  installationScope?: "workspace" | "global";
  agentPermissionDefaults?: {
    fileSystem: "readonly" | "readwrite" | "none";
    shell: boolean;
    network: boolean;
    humanApprovalRequired: boolean;
  };
  pipelineDefaults?: {
    timeoutMs: number;
    maxRetries: number;
  };
  approvalPreferences?: {
    autoPauseOnGate: boolean;
    requireNote: boolean;
  };
  storageLocation?: string;
}

export interface AppState {
  version: string;
  settings: AppSettings;
}

export type InstallScope = "user" | "workspace";

export interface InstallTarget {
  platform: PlatformCompatibility;
  scope: InstallScope;
  root: string;
  displayPath: string;
}

export interface InstalledArtifact {
  platform: PlatformCompatibility;
  scope: InstallScope;
  root: string;
  files: string[];
  installedAt: string;
  simulated: boolean;
}

export interface InstallPlanSummary {
  target: InstallTarget;
  existing: string[];
  supported: boolean;
  simulated: boolean;
  files: string[];
}

export interface UninstallSummary {
  recordRemoved: boolean;
  diskRemoved: boolean;
  simulated: boolean;
  message: string;
}

export interface PackageFile {
  path: string;
  content: string;
}

export interface PackageManifest {
  kind: "agentforge-skill";
  skillId: string;
  skillName: string;
  version: string;
  exportedAt: string;
  files: string[];
}

export interface ExportResult {
  format: "skill-md" | "package";
  skillId: string;
  skillName: string;
  version: string;
  fileName: string;
  primaryContent: string;
  files: PackageFile[];
  manifest?: PackageManifest;
  validation: { valid: boolean; errors: unknown[]; warnings: unknown[]; suggestions: unknown[] };
}

export type DuplicateKind = "none" | "same-version" | "older-existing" | "newer-existing";

export interface ImportPreview {
  valid: boolean;
  skill: Partial<Skill>;
  files: PackageFile[];
  duplicate: { kind: DuplicateKind; existingId?: string; existingVersion?: string };
  validation: { valid: boolean; errors: unknown[]; warnings: unknown[]; suggestions: unknown[] };
  warnings: string[];
  errors: string[];
}

export interface ImportSaveResult {
  skill: Skill;
  updated: boolean;
  files: PackageFile[];
}

export type MessageType =
  | "app.ready"
  | "app.getState"
  | "app.getDashboardData"
  | "skills.list"
  | "skills.get"
  | "skills.create"
  | "skills.update"
  | "skills.duplicate"
  | "skills.delete"
  | "skills.validate"
  | "skills.history"
  | "skills.diff"
  | "skills.export"
  | "skills.importPreview"
  | "skills.importSave"
  | "skills.installTargets"
  | "skills.installPlan"
  | "skills.install"
  | "skills.batchInstall"
  | "skills.installations"
  | "skills.uninstall"
  | "skills.getResourceContent"
  | "skills.saveResourceContent"
  | "agents.list"
  | "agents.get"
  | "agents.create"
  | "agents.update"
  | "agents.duplicate"
  | "agents.delete"
  | "agents.validate"
  | "agents.export"
  | "agents.compatibility"
  | "agents.exportPlatform"
  | "agents.installTargets"
  | "agents.installPlan"
  | "agents.install"
  | "agents.batchInstall"
  | "agents.installations"
  | "agents.uninstall"
  | "workflows.list"
  | "workflows.get"
  | "workflows.create"
  | "workflows.update"
  | "workflows.duplicate"
  | "workflows.delete"
  | "workflows.validate"
  | "workflows.exportPackage"
  | "workflows.importPackage"
  | "workflows.install"
  | "executions.list"
  | "executions.get"
  | "executions.start"
  | "executions.resume"
  | "executions.recover"
  | "executions.cancel"
  | "settings.get"
  | "settings.update"
  | "app.resetDemoData"
  | "app.navigate"
  | "app.clientError"
  | "audit.list"
  | "audit.record"
  | "audit.clear"
  | "packages.list"
  | "packages.validate"
  | "packages.install"
  | "packages.uninstall"
  | "packages.export"
  | "packages.backups"
  | "packages.restoreBackup"
  | "integrations.list"
  | "integrations.configure"
  | "integrations.validate"
  | "integrations.disconnect"
  | "settings.exportAll"
  | "settings.importAll"
  | "persona.list"
  | "persona.crawl"
  | "persona.cancelCrawl"
  | "persona.compile"
  | "persona.evaluate"
  | "persona.reCrawl"
  | "persona.save"
  | "persona.listWorkspaces"
  | "persona.listVersions"
  | "persona.rollbackVersion";


export interface RequestMessage {
  type: MessageType;
  id: string;
  payload?: unknown;
}

export interface ResponseMessage {
  type: string;
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export type DiffChangeStatus = "added" | "removed" | "modified" | "unchanged";

export interface NodeConfigurationChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface ContractFieldChange {
  contract: "input" | "output";
  field: string;
  before: unknown;
  after: unknown;
}

export interface NodeDiff {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: DiffChangeStatus;
  configChanges: NodeConfigurationChange[];
  agentChange?: { before?: string; after?: string };
  skillChange?: { before?: string; after?: string };
  contractChanges: ContractFieldChange[];
  runDetailsA?: {
    status?: string;
    durationMs?: number;
    validationPassed?: boolean;
    validationMessage?: string;
    error?: string;
    isFailurePoint?: boolean;
    retryCount?: number;
  };
  runDetailsB?: {
    status?: string;
    durationMs?: number;
    validationPassed?: boolean;
    validationMessage?: string;
    error?: string;
    isFailurePoint?: boolean;
    retryCount?: number;
  };
}

export interface EdgeDiff {
  edgeId: string;
  source: string;
  target: string;
  status: DiffChangeStatus;
  labelChange?: { before?: string; after?: string };
}

export interface DiffMetricSummary {
  addedNodesCount: number;
  removedNodesCount: number;
  modifiedNodesCount: number;
  unchangedNodesCount: number;
  addedEdgesCount: number;
  removedEdgesCount: number;
  modifiedEdgesCount: number;
  unchangedEdgesCount: number;
  durationDeltaMs?: number;
  statusChanged?: boolean;
  failurePointsA: string[];
  failurePointsB: string[];
}

export interface WorkflowDiffResult {
  sourceType: "workflow" | "execution";
  targetA: {
    id: string;
    name: string;
    version?: string;
    status?: string;
    finalSummary?: string;
    durationMs?: number;
    startedAt?: string;
    completedAt?: string;
    isSimulated?: boolean;
  };
  targetB: {
    id: string;
    name: string;
    version?: string;
    status?: string;
    finalSummary?: string;
    durationMs?: number;
    startedAt?: string;
    completedAt?: string;
    isSimulated?: boolean;
  };
  nodeDiffs: NodeDiff[];
  edgeDiffs: EdgeDiff[];
  summary: DiffMetricSummary;
}

export interface ExecutionFilters {
  search?: string;
  status?: string;
  workflowId?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
}

export type ExecutionSortField = "startedAt" | "durationMs" | "status" | "workflowName" | "totalSteps";

// Evaluation Types
export type EvaluationTargetType = "skill" | "agent" | "pipeline";
export type EvaluationCheckStatus = "passed" | "failed" | "warning" | "skipped";
export type EvaluationOverallStatus = "passed" | "failed" | "warning";

export interface EvaluationFinding {
  severity: "error" | "warning" | "suggestion";
  field: string;
  message: string;
  suggestedCorrection?: string;
}

export interface EvaluationCheck {
  id: string;
  name: string;
  category: string;
  status: EvaluationCheckStatus;
  message: string;
  errorDetails?: string;
  suggestedCorrection?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
}

export interface ConfigurableTestCase {
  id: string;
  name: string;
  description?: string;
  inputPayload: Record<string, unknown> | string;
  expectedOutputMatcher?: string | Record<string, unknown>;
  expectedStatus?: "Succeeded" | "Failed";
  timeoutSeconds?: number;
}

export interface EvaluationMetrics {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  durationMs: number;
}

export interface ResourceLink {
  targetType: EvaluationTargetType;
  targetId: string;
  targetName: string;
  version?: string;
  route: string;
}

export interface EvaluationReport {
  id: string;
  targetType: EvaluationTargetType;
  targetId: string;
  targetName: string;
  targetVersion: string;
  timestamp: string;
  overallStatus: EvaluationOverallStatus;
  metrics: EvaluationMetrics;
  checks: EvaluationCheck[];
  errors: string[];
  warnings: string[];
  suggestedCorrections: string[];
  resourceLink: ResourceLink;
  isSimulatedMock: true;
  disclaimer: string;
}

export interface EvaluationContext {
  knownSkillIds?: Set<string>;
  knownAgentIds?: Set<string>;
  knownWorkflowIds?: Set<string>;
  customTestCases?: ConfigurableTestCase[];
}

// Governance and Audit Types
export type AuditEventType =
  | "skill.created"
  | "skill.edited"
  | "skill.exported"
  | "skill.installed"
  | "skill.removed"
  | "agent.created"
  | "agent.edited"
  | "agent.exported"
  | "agent.installed"
  | "agent.removed"
  | "workflow.created"
  | "workflow.updated"
  | "workflow.deleted"
  | "execution.started"
  | "execution.paused"
  | "execution.completed"
  | "execution.failed"
  | "execution.cancelled"
  | "approval.recorded"
  | "package.imported"
  | "package.exported"
  | "settings.changed";

export type AuditOutcome = "success" | "failure" | "denied" | "cancelled";
export type AuditSeverity = "info" | "warning" | "error" | "critical";

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  resourceId: string;
  resourceName: string;
  outcome: AuditOutcome;
  severity: AuditSeverity;
  actor: string;
  details: Record<string, unknown>;
}

export interface AuditFilters {
  search?: string;
  eventType?: string;
  outcome?: string;
  resourceId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

export interface GovernancePolicyConfig {
  leastPrivilegeEnforced: boolean;
  defaultNetworkAllowed: boolean;
  defaultFileSystemMode: "none" | "read" | "readwrite";
  defaultShellExecutionAllowed: boolean;
  defaultHumanApprovalRequired: boolean;
  defaultRestrictedPaths: string[];
  maxTokensLimit: number;
}

export interface PathValidationResult {
  valid: boolean;
  normalizedPath?: string;
  error?: string;
}

// Package Manager Domain Types
export type PackageType =
  | "skill-package"
  | "agent-bundle"
  | "workflow-pipeline"
  | "full-kit";

export interface PackageEntryFile {
  path: string;
  description: string;
  type: "skill-md" | "agent-config" | "workflow-json" | "reference-doc" | "resource";
}

export interface PackageDependency {
  id: string;
  name: string;
  versionRange: string;
  optional?: boolean;
}

export interface PackageIntegrity {
  algorithm: "sha256";
  hash: string;
  signedBy?: string;
  generatedAt: string;
}

export interface PackageManagerManifest {
  id: string;
  name: string;
  version: string;
  type: PackageType;
  schemaVersion: number;
  description: string;
  author: string;
  compatibility: string[];
  entryFiles: PackageEntryFile[];
  dependencies: PackageDependency[];
  integrity: PackageIntegrity;
  changelog: string;
  tags: string[];
  license?: string;
  homepage?: string;
}

export interface PackageBundle {
  manifest: PackageManagerManifest;
  skills?: Skill[];
  agents?: Agent[];
  workflows?: Workflow[];
  files?: { path: string; content: string }[];
  isSimulated?: boolean;
}

export interface InstalledPackageRecord {
  id: string;
  manifest: PackageManagerManifest;
  status: "installed" | "update-available" | "conflict";
  installedAt: string;
  installedVersion: string;
  availableVersion?: string;
  scope: "workspace" | "global";
  backupAvailable?: boolean;
}

export interface PackageValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  compatibilityWarnings: string[];
  integrityVerified: boolean;
  duplicateOrConflict?: {
    existingVersion: string;
    newVersion: string;
    conflictType: "duplicate" | "downgrade" | "upgrade";
    message: string;
  };
}

export interface PackageBackupRecord {
  id: string;
  packageId: string;
  packageName: string;
  version: string;
  createdAt: string;
  reason: string;
  dataSnapshot: unknown;
}

// Platform Integrations Domain Types
export type PlatformIntegrationId = "copilot" | "claude" | "openai";

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "mock_active"
  | "error"
  | "unconfigured";

export interface PlatformIntegrationConfig {
  id: PlatformIntegrationId;
  name: string;
  type: PlatformIntegrationId;
  connectionStatus: ConnectionStatus;
  endpointUrl?: string;
  targetModel?: string;
  isMock: boolean;
  hasStoredSecret: boolean;
  lastValidatedAt?: string;
  lastValidationMessage?: string;
  supportedFeatures: string[];
  limitations: string[];
  documentationUrl: string;
}

export interface IntegrationValidationResult {
  valid: boolean;
  status: ConnectionStatus;
  message: string;
  latencyMs?: number;
  checkedAt: string;
  isMock: boolean;
  modelDetected?: string;
}



