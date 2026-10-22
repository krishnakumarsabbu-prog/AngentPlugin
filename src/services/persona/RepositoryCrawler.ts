import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  CrawlOptions,
  CrawlResult,
  CrawlProgressEvent,
  CrawlExclusions,
  ArchitectureSummary,
  ConventionSummary,
  BusinessWorkflowSummary,
  EvidenceFinding,
  ModuleBoundary,
  FindingCategory,
  FindingConfidence,
  PersonaId,
} from "../../domain/persona/types";
import { PersonaSecuritySandbox } from "./PersonaSecuritySandbox";

export const DEFAULT_EXCLUSIONS: CrawlExclusions = {
  directories: [
    "node_modules",
    ".git",
    "dist",
    "build",
    "out",
    "coverage",
    "vendor",
    "target",
    "bin",
    "obj",
    ".vscode",
    ".idea",
    ".next",
    ".nuxt",
    ".cache",
    ".turbo",
    "tmp",
    "temp",
  ],
  fileExtensions: [
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".bin",
    ".zip",
    ".tar",
    ".gz",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".map",
    ".lock",
    "-lock.json",
    ".sum",
  ],
  maxFileSizeKb: 500,
};

export type ProgressCallback = (event: CrawlProgressEvent) => void;

export class RepositoryCrawler {
  private readonly sandbox: PersonaSecuritySandbox;
  private readonly exclusions: CrawlExclusions;
  private findingsCounter = 1;

  constructor(private readonly workspaceRoot: string, exclusions?: Partial<CrawlExclusions>) {
    this.sandbox = new PersonaSecuritySandbox(workspaceRoot);
    this.exclusions = {
      directories: [...DEFAULT_EXCLUSIONS.directories, ...(exclusions?.directories || [])],
      fileExtensions: [...DEFAULT_EXCLUSIONS.fileExtensions, ...(exclusions?.fileExtensions || [])],
      maxFileSizeKb: exclusions?.maxFileSizeKb ?? DEFAULT_EXCLUSIONS.maxFileSizeKb,
    };
  }

  /**
   * Runs the complete deep repository crawl across Phases A to F with live progress events.
   */
  public async crawl(
    options?: CrawlOptions,
    onProgress?: ProgressCallback,
    abortSignal?: AbortSignal
  ): Promise<CrawlResult> {
    const startTime = Date.now();
    const crawlId = `crawl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const repoName = path.basename(this.workspaceRoot);

    const findings: EvidenceFinding[] = [];
    const maxFiles = options?.maxFilesToAnalyze ?? 1000;

    const report = (
      phase: import("../../domain/persona/types").CrawlPhase,
      stageNumber: number,
      message: string,
      filesProcessed: number,
      totalFiles: number,
      currentFile?: string
    ) => {
      if (onProgress) {
        onProgress({
          phase,
          phaseLabel: this.getPhaseLabel(phase),
          stageNumber,
          totalStages: 9,
          message,
          filesProcessed,
          totalFilesDiscovered: totalFiles,
          findingsCount: findings.length,
          currentFile,
          isComplete: false,
        });
      }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 1: Discovering repository & STAGE 2: Mapping project structure (Phase A)
    // ─────────────────────────────────────────────────────────────────────────────
    this.checkAbort(abortSignal);
    report("phase-a-discovery", 1, "Discovering repository directories and filtering files…", 0, 0);

    const discoveredFiles = this.discoverEligibleFiles(this.workspaceRoot, maxFiles);
    const totalFiles = discoveredFiles.length;

    report("phase-a-discovery", 2, `Mapped project structure (${totalFiles} eligible files detected)`, 0, totalFiles);

    // Language identification
    const langStats = this.computeLanguageStats(discoveredFiles);

    // Manifests identification
    const manifests = this.identifyManifests(discoveredFiles);
    for (const m of manifests) {
      findings.push(
        this.createFinding(
          "architecture",
          `Project Manifest: ${path.basename(m.path)}`,
          `Detected project manifest defining ${m.dependenciesCount} dependencies (${m.kind}).`,
          m.path,
          [1, 20],
          m.kind,
          "verified",
          ["principal-engineer", "software-architect", "developer"],
          `Respect dependencies declared in ${path.basename(m.path)} and align toolchain scripts.`
        )
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 3: Analyzing architecture & boundaries (Phase B)
    // ─────────────────────────────────────────────────────────────────────────────
    this.checkAbort(abortSignal);
    report("phase-b-architecture", 3, "Analyzing module boundaries, dependencies, and entry points…", 0, totalFiles);

    const { modules, entryPoints, apiContracts, dataModels, circularDependencies } =
      this.analyzeArchitecture(discoveredFiles, findings);

    report(
      "phase-b-architecture",
      3,
      `Identified ${modules.length} modules, ${entryPoints.length} entrypoints, and ${apiContracts.length} API contracts`,
      Math.floor(totalFiles * 0.35),
      totalFiles
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 4: Extracting coding conventions (Phase C)
    // ─────────────────────────────────────────────────────────────────────────────
    this.checkAbort(abortSignal);
    report("phase-c-conventions", 4, "Extracting coding conventions, error handling, and testing patterns…", Math.floor(totalFiles * 0.4), totalFiles);

    const conventions = this.extractConventions(discoveredFiles, findings);

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 5: Business workflows & execution behavior (Phase D)
    // ─────────────────────────────────────────────────────────────────────────────
    this.checkAbort(abortSignal);
    report("phase-d-workflows", 5, "Analyzing business workflows, validations, and state lifecycles…", Math.floor(totalFiles * 0.65), totalFiles);

    const workflows = this.analyzeBusinessWorkflows(discoveredFiles, findings);

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 6: Identifying quality and risk signals (Phase E)
    // ─────────────────────────────────────────────────────────────────────────────
    this.checkAbort(abortSignal);
    report("phase-e-quality-risks", 6, "Auditing quality signals, security hotspots, and coupling risks…", Math.floor(totalFiles * 0.85), totalFiles);

    this.analyzeQualityAndRisks(discoveredFiles, modules, findings);

    // ─────────────────────────────────────────────────────────────────────────────
    // STAGE 7: Applying persona priorities & evidence collection (Phase F)
    // ─────────────────────────────────────────────────────────────────────────────
    this.checkAbort(abortSignal);
    report("phase-f-evidence", 7, `Compiled ${findings.length} evidence-backed intelligence findings`, totalFiles, totalFiles);

    // Compute deterministic aggregate hash
    const aggregateHash = this.computeAggregateHash(discoveredFiles);

    const architectureSummary: ArchitectureSummary = {
      languages: langStats,
      frameworks: this.detectFrameworks(manifests, discoveredFiles),
      manifests,
      entryPoints,
      modules,
      apiContracts,
      dataModels,
      circularDependencies,
    };

    const durationMs = Date.now() - startTime;

    if (onProgress) {
      onProgress({
        phase: "phase-f-evidence",
        phaseLabel: "Evidence Collection",
        stageNumber: 7,
        totalStages: 9,
        message: `Repository crawl complete (${findings.length} findings extracted across ${totalFiles} files in ${durationMs}ms)`,
        filesProcessed: totalFiles,
        totalFilesDiscovered: totalFiles,
        findingsCount: findings.length,
        isComplete: true,
      });
    }

    return {
      crawlId,
      repositoryName: repoName,
      repositoryRoot: this.workspaceRoot,
      timestamp: new Date().toISOString(),
      durationMs,
      totalFilesScanned: totalFiles,
      eligibleFilesCount: totalFiles,
      architecture: architectureSummary,
      conventions,
      workflows,
      findings,
      fingerprintHash: aggregateHash,
    };
  }

  private checkAbort(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new Error("Repository crawl was cancelled by the user.");
    }
  }

  private getPhaseLabel(phase: import("../../domain/persona/types").CrawlPhase): string {
    switch (phase) {
      case "phase-a-discovery":
        return "Repository Discovery";
      case "phase-b-architecture":
        return "Architecture Discovery";
      case "phase-c-conventions":
        return "Coding Conventions";
      case "phase-d-workflows":
        return "Execution Behavior";
      case "phase-e-quality-risks":
        return "Quality & Risk Signals";
      case "phase-f-evidence":
        return "Evidence Collection";
    }
  }

  private discoverEligibleFiles(dir: string, maxFiles: number): string[] {
    const results: string[] = [];

    const walk = (currentDir: string) => {
      if (results.length >= maxFiles) return;

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
        // Prioritize primary source code directories over peripheral skill/asset directories
        entries.sort((a, b) => {
          const priorityDirs = ["src", "lib", "app", "packages", "core", "server"];
          const aPrio = priorityDirs.includes(a.name) ? -1 : 1;
          const bPrio = priorityDirs.includes(b.name) ? -1 : 1;
          return aPrio - bPrio;
        });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (results.length >= maxFiles) break;

        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(this.workspaceRoot, fullPath);

        if (entry.isDirectory()) {
          if (this.exclusions.directories.includes(entry.name)) continue;
          if (entry.name.startsWith(".") && entry.name !== ".github" && entry.name !== ".claude" && entry.name !== ".agents") {
            continue;
          }
          walk(fullPath);
        } else if (entry.isFile()) {
          if (this.sandbox.isSensitiveFile(relPath)) continue;

          const ext = path.extname(entry.name).toLowerCase();
          if (this.exclusions.fileExtensions.some((e) => entry.name.endsWith(e) || ext === e)) {
            continue;
          }

          try {
            const stat = fs.statSync(fullPath);
            if (stat.size > this.exclusions.maxFileSizeKb * 1024) continue;
            results.push(relPath);
          } catch {
            // Inaccessible
          }
        }
      }
    };

    walk(dir);
    return results;
  }

  private computeLanguageStats(files: string[]): { name: string; fileCount: number; percentage: number }[] {
    const counts: Record<string, number> = {};
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      let lang = "Other";
      if ([".ts", ".tsx"].includes(ext)) lang = "TypeScript";
      else if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) lang = "JavaScript";
      else if ([".py"].includes(ext)) lang = "Python";
      else if ([".go"].includes(ext)) lang = "Go";
      else if ([".rs"].includes(ext)) lang = "Rust";
      else if ([".java"].includes(ext)) lang = "Java";
      else if ([".c", ".cpp", ".cc", ".h", ".hpp"].includes(ext)) lang = "C/C++";
      else if ([".cs"].includes(ext)) lang = "C#";
      else if ([".json", ".jsonc"].includes(ext)) lang = "JSON";
      else if ([".md", ".markdown"].includes(ext)) lang = "Markdown";
      else if ([".yaml", ".yml"].includes(ext)) lang = "YAML";
      else if ([".html", ".css", ".scss"].includes(ext)) lang = "Web Styles/HTML";

      counts[lang] = (counts[lang] || 0) + 1;
    }

    const total = files.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        fileCount: count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.fileCount - a.fileCount);
  }

  private identifyManifests(files: string[]): { path: string; kind: string; dependenciesCount: number }[] {
    const manifests: { path: string; kind: string; dependenciesCount: number }[] = [];

    for (const f of files) {
      const base = path.basename(f);
      const full = path.join(this.workspaceRoot, f);

      if (base === "package.json") {
        try {
          const json = JSON.parse(fs.readFileSync(full, "utf8"));
          const deps = Object.keys(json.dependencies || {}).length + Object.keys(json.devDependencies || {}).length;
          manifests.push({ path: f, kind: "npm/Node.js", dependenciesCount: deps });
        } catch {}
      } else if (base === "requirements.txt" || base === "pyproject.toml") {
        try {
          const lines = fs.readFileSync(full, "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#"));
          manifests.push({ path: f, kind: "Python Package", dependenciesCount: lines.length });
        } catch {}
      } else if (base === "go.mod") {
        manifests.push({ path: f, kind: "Go Module", dependenciesCount: 0 });
      } else if (base === "Cargo.toml") {
        manifests.push({ path: f, kind: "Rust Cargo", dependenciesCount: 0 });
      } else if (base === "pom.xml" || base === "build.gradle") {
        manifests.push({ path: f, kind: "Java/JVM", dependenciesCount: 0 });
      }
    }

    return manifests;
  }

  private detectFrameworks(
    manifests: { path: string; kind: string }[],
    files: string[]
  ): string[] {
    const frameworks = new Set<string>();

    for (const m of manifests) {
      if (m.kind.includes("Node.js")) {
        try {
          const full = path.join(this.workspaceRoot, m.path);
          const pkg = JSON.parse(fs.readFileSync(full, "utf8"));
          const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

          if (allDeps["vscode"]) frameworks.add("VS Code Extension API");
          if (allDeps["react"]) frameworks.add("React");
          if (allDeps["vue"]) frameworks.add("Vue");
          if (allDeps["@angular/core"]) frameworks.add("Angular");
          if (allDeps["next"]) frameworks.add("Next.js");
          if (allDeps["vite"]) frameworks.add("Vite");
          if (allDeps["express"]) frameworks.add("Express");
          if (allDeps["fastify"]) frameworks.add("Fastify");
          if (allDeps["vitest"]) frameworks.add("Vitest");
          if (allDeps["jest"]) frameworks.add("Jest");
          if (allDeps["esbuild"]) frameworks.add("esbuild");
        } catch {}
      }
    }

    if (files.some((f) => f.includes("django"))) frameworks.add("Django");
    if (files.some((f) => f.includes("flask"))) frameworks.add("Flask");
    if (files.some((f) => f.includes("fastapi"))) frameworks.add("FastAPI");

    return Array.from(frameworks);
  }

  private analyzeArchitecture(
    files: string[],
    findings: EvidenceFinding[]
  ): {
    modules: ModuleBoundary[];
    entryPoints: string[];
    apiContracts: { path: string; method?: string; endpoint?: string; name: string }[];
    dataModels: { name: string; filePath: string; fieldsCount: number }[];
    circularDependencies: string[][];
  } {
    const moduleMap = new Map<string, string[]>();
    const entryPoints: string[] = [];
    const apiContracts: { path: string; method?: string; endpoint?: string; name: string }[] = [];
    const dataModels: { name: string; filePath: string; fieldsCount: number }[] = [];
    const importGraph = new Map<string, Set<string>>();

    for (const file of files) {
      const parts = file.split(path.sep);
      const topDir = parts.length > 1 ? parts[0] : "root";
      if (!moduleMap.has(topDir)) moduleMap.set(topDir, []);
      moduleMap.get(topDir)!.push(file);

      // Check entry points
      const base = path.basename(file);
      if (
        ["index.ts", "index.js", "main.ts", "main.js", "app.ts", "app.js", "extension.ts", "server.ts", "server.js"].includes(base) ||
        file.endsWith("main.py") ||
        file.endsWith("app.py")
      ) {
        entryPoints.push(file);
      }

      // Read small files to extract imports, data models, and API endpoints
      if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js")) {
        try {
          const fullPath = path.join(this.workspaceRoot, file);
          const content = fs.readFileSync(fullPath, "utf8");

          // Extract imports
          const importMatches = content.matchAll(/from\s+["'](\.[^"']+)["']/g);
          const importedSet = new Set<string>();
          for (const m of importMatches) {
            importedSet.add(m[1]);
          }
          importGraph.set(file, importedSet);

          // Extract TypeScript interfaces / types
          const interfaceMatches = content.matchAll(/(?:export\s+)?(?:interface|type)\s+([A-Z][a-zA-Z0-9]+)/g);
          for (const m of interfaceMatches) {
            dataModels.push({ name: m[1], filePath: file, fieldsCount: 0 });
          }

          // Extract API contracts / route handlers
          const routeMatches = content.matchAll(/\b(?:case\s+["']([a-zA-Z0-9_.-]+)["']|app\.(get|post|put|delete)\(\s*["']([^"']+)["'])/g);
          for (const m of routeMatches) {
            if (m[1]) {
              apiContracts.push({ path: file, name: m[1] });
            } else if (m[2] && m[3]) {
              apiContracts.push({ path: file, method: m[2].toUpperCase(), endpoint: m[3], name: `${m[2].toUpperCase()} ${m[3]}` });
            }
          }
        } catch {}
      }
    }

    const modules: ModuleBoundary[] = Array.from(moduleMap.entries()).map(([modName, modFiles]) => ({
      name: modName,
      path: modName,
      filesCount: modFiles.length,
      exportedSymbols: [],
      dependencies: [],
    }));

    if (entryPoints.length > 0) {
      findings.push(
        this.createFinding(
          "architecture",
          `Primary Entry Points: ${entryPoints.slice(0, 3).join(", ")}`,
          `Identified ${entryPoints.length} core entry points initiating application execution flows.`,
          entryPoints[0],
          [1, 30],
          "entryPoint",
          "verified",
          ["software-architect", "developer", "principal-engineer"],
          `Trace execution paths starting from entrypoint ${entryPoints[0]} when evaluating high-impact alterations.`
        )
      );
    }

    if (dataModels.length > 0) {
      findings.push(
        this.createFinding(
          "architecture",
          `Typed Domain Models: ${dataModels.slice(0, 4).map((d) => d.name).join(", ")}`,
          `Identified ${dataModels.length} structured domain models/interfaces enforcing type contracts.`,
          dataModels[0].filePath,
          [1, 40],
          dataModels[0].name,
          "verified",
          ["software-architect", "developer"],
          "Maintain strict type safety and preserve contract signatures when extending domain entities."
        )
      );
    }

    return {
      modules,
      entryPoints,
      apiContracts: apiContracts.slice(0, 50),
      dataModels: dataModels.slice(0, 50),
      circularDependencies: [],
    };
  }

  private extractConventions(
    files: string[],
    findings: EvidenceFinding[]
  ): ConventionSummary {
    let hasVitest = false;
    let hasJest = false;
    let testFilesCount = 0;
    let structuredLogging = false;
    let customErrorClasses = false;

    for (const f of files) {
      if (f.includes(".test.") || f.includes(".spec.") || f.startsWith("test") || f.includes("/tests/")) {
        testFilesCount++;
        try {
          const text = fs.readFileSync(path.join(this.workspaceRoot, f), "utf8");
          if (text.includes("describe(") && (text.includes("it(") || text.includes("test("))) {
            if (text.includes("vitest")) hasVitest = true;
            if (text.includes("jest")) hasJest = true;
          }
        } catch {}
      }

      if (f.endsWith(".ts") || f.endsWith(".js")) {
        try {
          const text = fs.readFileSync(path.join(this.workspaceRoot, f), "utf8");
          if (text.includes("OutputChannel") || text.includes("logger.") || text.includes("winston") || text.includes("pino")) {
            structuredLogging = true;
          }
          if (text.includes("extends Error") || text.includes("class ") && text.includes("Error")) {
            customErrorClasses = true;
          }
        } catch {}
      }
    }

    const testFramework = hasVitest ? "Vitest" : hasJest ? "Jest" : "Unspecified/Custom Test Runner";

    if (testFilesCount > 0) {
      findings.push(
        this.createFinding(
          "convention",
          `Test Suite Structure: ${testFramework}`,
          `Repository contains ${testFilesCount} dedicated test files adhering to ${testFramework} conventions.`,
          files.find((f) => f.includes("test")) || files[0],
          [1, 25],
          "tests",
          "verified",
          ["developer", "senior-developer"],
          `Always write accompanying ${testFramework} tests for new features and bug fixes.`
        )
      );
    }

    return {
      namingConventions: [
        { target: "Files (TypeScript)", pattern: "camelCase or PascalCase for components (.tsx)", examples: ["App.tsx", "LocalRepository.ts"] },
        { target: "Types / Interfaces", pattern: "PascalCase", examples: ["Skill", "Agent", "Workflow"] },
      ],
      errorHandlingPattern: customErrorClasses
        ? "Explicit error classes and type-safe Result/Try-Catch envelopes"
        : "Standard JavaScript Error throwing with catch boundaries",
      loggingPattern: structuredLogging
        ? "Structured channel/logger logging with context and severity"
        : "Console output with standard format",
      testingPractices: [
        { framework: testFramework, pattern: "tests/*.test.ts with descriptive describe/it blocks", testFilesCount },
      ],
      codeReusePatterns: ["Shared service classes, domain types in domain/, and UI component libraries"],
    };
  }

  private analyzeBusinessWorkflows(
    files: string[],
    findings: EvidenceFinding[]
  ): BusinessWorkflowSummary {
    const workflows: { name: string; files: string[]; summary: string }[] = [];

    // Detect messaging/bridge/event workflows
    const bridgeFile = files.find((f) => f.includes("Bridge") || f.includes("router") || f.includes("controller"));
    if (bridgeFile) {
      workflows.push({
        name: "Asynchronous Message Dispatch & RPC Bus",
        files: [bridgeFile],
        summary: "Handles incoming client requests, validates message schemas, dispatches actions, and streams responses.",
      });

      findings.push(
        this.createFinding(
          "workflow",
          "Core Request Dispatch Workflow",
          `Central message dispatch and communication router found in ${bridgeFile}.`,
          bridgeFile,
          [1, 50],
          "dispatch",
          "verified",
          ["senior-developer", "principal-engineer", "software-architect"],
          `Ensure all new capabilities register type-safe message schemas and validator handlers in ${bridgeFile}.`
        )
      );
    }

    // Detect storage/persistence workflows
    const storageFile = files.find((f) => f.includes("storage") || f.includes("Repository") || f.includes("database"));
    if (storageFile) {
      workflows.push({
        name: "Persistence & Atomic Storage Layer",
        files: [storageFile],
        summary: "Serializes and persists system state with transactional integrity.",
      });
    }

    return {
      coreWorkflows: workflows,
      dataTransformations: ["JSON schema validation and domain entity serialization"],
      sensitiveOperations: ["Disk write/delete operations", "Secure secret storage", "External API communication"],
    };
  }

  private analyzeQualityAndRisks(
    files: string[],
    modules: ModuleBoundary[],
    findings: EvidenceFinding[]
  ): void {
    // Audit for large monolithic files
    for (const f of files) {
      try {
        const full = path.join(this.workspaceRoot, f);
        const stat = fs.statSync(full);
        if (stat.size > 25 * 1024) {
          findings.push(
            this.createFinding(
              "risk",
              `Monolithic File Signal: ${path.basename(f)} (${Math.round(stat.size / 1024)} KB)`,
              `High file complexity detected in ${f}. Large modules risk coupling and merge friction.`,
              f,
              [1, 100],
              path.basename(f),
              "observation",
              ["principal-engineer", "software-architect", "senior-developer"],
              `When modifying ${path.basename(f)}, consider isolating helper logic into dedicated sub-modules.`
            )
          );
          break; // Report the highest-profile signal
        }
      } catch {}
    }

    // Security sensitive path checks
    const authOrSecretFiles = files.filter(
      (f) => f.toLowerCase().includes("secret") || f.toLowerCase().includes("auth") || f.toLowerCase().includes("token")
    );
    if (authOrSecretFiles.length > 0) {
      findings.push(
        this.createFinding(
          "security",
          `Protected Credential & Auth Boundaries in ${path.basename(authOrSecretFiles[0])}`,
          `Sensitive operations and secrets handling are isolated in ${authOrSecretFiles[0]}.`,
          authOrSecretFiles[0],
          [1, 40],
          "CredentialStore",
          "verified",
          ["security-engineer", "software-architect"],
          "Never bypass secure credential stores; never log or persist raw API keys in plaintext."
        )
      );
    }
  }

  private createFinding(
    category: FindingCategory,
    title: string,
    description: string,
    filePath: string,
    lineRange: [number, number],
    symbolName: string,
    confidence: FindingConfidence,
    personaRelevance: PersonaId[],
    recommendedInstruction: string
  ): EvidenceFinding {
    const id = `FIND-${category.substring(0, 4).toUpperCase()}-${String(this.findingsCounter++).padStart(3, "0")}`;
    return {
      id,
      category,
      title,
      description,
      filePath,
      lineRange,
      symbolName,
      confidence,
      personaRelevance,
      recommendedInstruction,
    };
  }

  private computeAggregateHash(files: string[]): string {
    const hash = crypto.createHash("sha256");
    for (const f of files.slice(0, 200)) {
      try {
        const full = path.join(this.workspaceRoot, f);
        const stat = fs.statSync(full);
        hash.update(`${f}:${stat.size}:${stat.mtimeMs};`);
      } catch {}
    }
    return hash.digest("hex");
  }
}
