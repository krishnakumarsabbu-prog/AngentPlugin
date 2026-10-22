export type PersonaId =
  | "developer"
  | "senior-developer"
  | "principal-engineer"
  | "software-architect"
  | "security-engineer"
  | "sre-reliability-engineer"
  | string;

export interface EngineeringPersona {
  id: PersonaId;
  name: string;
  title: string;
  badge: string;
  icon: string;
  roleDescription: string;
  primaryFocus: string[];
  responsibilities: string[];
  analysisPriorities: string[];
  decisionPrinciples: string[];
  mandatoryReviewQuestions: string[];
  expectedWorkflows: string[];
  qualityGates: string[];
  prohibitedActions: string[];
  outputExpectations: string[];
}

export type FindingCategory =
  | "architecture"
  | "convention"
  | "workflow"
  | "risk"
  | "security"
  | "reliability";

export type FindingConfidence = "verified" | "inferred" | "observation";

export interface EvidenceFinding {
  id: string;
  category: FindingCategory;
  title: string;
  description: string;
  filePath: string;
  lineRange?: [number, number];
  symbolName?: string;
  rawSnippet?: string;
  confidence: FindingConfidence;
  personaRelevance: PersonaId[];
  recommendedInstruction: string;
}

export interface CrawlExclusions {
  directories: string[];
  fileExtensions: string[];
  maxFileSizeKb: number;
}

export interface CrawlOptions {
  workspacePath: string;
  exclusions?: Partial<CrawlExclusions>;
  selectedPersonas?: PersonaId[];
  maxFilesToAnalyze?: number;
  includeEvidenceSnippets?: boolean;
}

export type CrawlPhase =
  | "phase-a-discovery"
  | "phase-b-architecture"
  | "phase-c-conventions"
  | "phase-d-workflows"
  | "phase-e-quality-risks"
  | "phase-f-evidence";

export interface CrawlProgressEvent {
  phase: CrawlPhase;
  phaseLabel: string;
  stageNumber: number;
  totalStages: number;
  message: string;
  filesProcessed: number;
  totalFilesDiscovered: number;
  findingsCount: number;
  currentFile?: string;
  isComplete: boolean;
  cancelled?: boolean;
}

export interface ModuleBoundary {
  name: string;
  path: string;
  filesCount: number;
  exportedSymbols: string[];
  dependencies: string[];
}

export interface ArchitectureSummary {
  languages: { name: string; fileCount: number; percentage: number }[];
  frameworks: string[];
  manifests: { path: string; kind: string; dependenciesCount: number }[];
  entryPoints: string[];
  modules: ModuleBoundary[];
  apiContracts: { path: string; method?: string; endpoint?: string; name: string }[];
  dataModels: { name: string; filePath: string; fieldsCount: number }[];
  circularDependencies: string[][];
}

export interface ConventionSummary {
  namingConventions: { target: string; pattern: string; examples: string[] }[];
  errorHandlingPattern: string;
  loggingPattern: string;
  testingPractices: { framework: string; pattern: string; testFilesCount: number }[];
  codeReusePatterns: string[];
}

export interface BusinessWorkflowSummary {
  coreWorkflows: { name: string; files: string[]; summary: string }[];
  dataTransformations: string[];
  sensitiveOperations: string[];
}

export interface CrawlResult {
  crawlId: string;
  repositoryName: string;
  repositoryRoot: string;
  timestamp: string;
  durationMs: number;
  totalFilesScanned: number;
  eligibleFilesCount: number;
  architecture: ArchitectureSummary;
  conventions: ConventionSummary;
  workflows: BusinessWorkflowSummary;
  findings: EvidenceFinding[];
  fingerprintHash: string;
  isPartial?: boolean;
  error?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  purpose: string;
}

export interface SkillIntermediateRepresentation {
  metadata: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    category: string;
    tags: string[];
    targetPlatforms: ("copilot" | "claude" | "openai" | "neutral")[];
    personas: PersonaId[];
    repositoryUri?: string;
    generationMode: "universal" | "repository-adaptive";
    fingerprintHash?: string;
    createdAt: string;
  };
  executiveContext: {
    systemOverview: string;
    techStack: { language: string; version?: string; framework?: string }[];
    architecturalStyle: string;
    entryPoints: string[];
  };
  responsibilitiesMatrix: {
    personaId: PersonaId;
    personaName: string;
    coreDuties: string[];
    reviewCheckpoints: string[];
    prohibitedActions: string[];
  }[];
  workflows: {
    id: string;
    title: string;
    trigger: string;
    steps: {
      stepNumber: number;
      action: string;
      guardrail: string;
      evidenceRef?: string;
    }[];
    mandatoryGates: string[];
  }[];
  engineeringRules: {
    ruleId: string;
    category: string;
    directive: string;
    rationale: string;
    evidenceFindingId?: string;
    prohibitedPatterns: string[];
  }[];
  qualityEvaluation?: EvaluationScorecard;
  files: GeneratedFile[];
}

export interface EvaluationScorecard {
  overallScore: number;
  dimensions: {
    personaAlignment: { score: number; rationale: string };
    repositoryGrounding: { score: number; rationale: string };
    actionability: { score: number; rationale: string };
    coverage: { score: number; rationale: string };
    safety: { score: number; rationale: string };
    portability: { score: number; rationale: string };
  };
  passedGates: string[];
  unsupportedAssumptions: string[];
  actionableRecommendations: string[];
  evaluatedAt: string;
}

export interface SkillGenerationRequest {
  mode: "universal" | "repository-adaptive";
  personaIds: PersonaId[];
  targetPlatforms: ("copilot" | "claude" | "openai" | "neutral")[];
  workspacePath?: string;
  crawlResult?: CrawlResult;
  skillName?: string;
  skillDescription?: string;
  customOrganizationalRules?: string[];
  excludedFindingIds?: string[];
}

export interface SkillGenerationResult {
  ir: SkillIntermediateRepresentation;
  files: GeneratedFile[];
  evaluation: EvaluationScorecard;
  mode: "universal" | "repository-adaptive";
}

export interface FingerprintEntry {
  relativePath: string;
  sizeBytes: number;
  mtimeMs: number;
  hash: string;
}

export interface RepositoryFingerprint {
  repositoryRoot: string;
  analyzedAt: string;
  aggregateHash: string;
  files: Record<string, FingerprintEntry>;
  personas: PersonaId[];
  version: number;
}
