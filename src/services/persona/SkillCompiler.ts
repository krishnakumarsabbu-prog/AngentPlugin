import {
  SkillGenerationRequest,
  SkillIntermediateRepresentation,
  GeneratedFile,
  SkillGenerationResult,
  EvaluationScorecard,
} from "../../domain/persona/types";
import { PersonaAdaptiveEngine } from "./PersonaAdaptiveEngine";
import { SkillQualityEvaluator } from "./SkillQualityEvaluator";

export class SkillCompiler {
  private readonly adaptiveEngine: PersonaAdaptiveEngine;
  private readonly evaluator: SkillQualityEvaluator;

  constructor() {
    this.adaptiveEngine = new PersonaAdaptiveEngine();
    this.evaluator = new SkillQualityEvaluator();
  }

  /**
   * Compiles a SkillGenerationRequest into the Intermediate Representation (IR)
   * and renders the complete file bundle.
   */
  public compile(request: SkillGenerationRequest): SkillGenerationResult {
    const isUniversal = request.mode === "universal" || !request.crawlResult;
    const plan = this.adaptiveEngine.composePlan(
      request.personaIds,
      request.crawlResult,
      request.customOrganizationalRules
    );

    const primaryPersona = plan.primaryPersona;
    const repoName = request.crawlResult?.repositoryName || "universal";
    const skillName =
      request.skillName ||
      (isUniversal
        ? `${primaryPersona.name} Engineering Practice`
        : `${repoName} ${primaryPersona.name} Skill`);

    const slug = skillName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const ir: SkillIntermediateRepresentation = {
      metadata: {
        id: slug || `persona-skill-${Date.now().toString(36)}`,
        name: skillName,
        version: "0.1.0",
        description:
          request.skillDescription ||
          `Engineered skill embodying the ${plan.personas.map((p) => p.name).join(" + ")} persona(s)${
            isUniversal ? " with universal engineering guardrails." : ` adapted to the ${repoName} repository.`
          }`,
        author: "AgentForge Persona Engine",
        category: "Engineering",
        tags: [
          "persona",
          ...plan.personas.map((p) => p.id),
          isUniversal ? "universal" : "repository-adaptive",
        ],
        targetPlatforms: request.targetPlatforms.length > 0 ? request.targetPlatforms : ["neutral"],
        personas: plan.personas.map((p) => p.id),
        repositoryUri: request.workspacePath,
        generationMode: request.mode,
        fingerprintHash: request.crawlResult?.fingerprintHash,
        createdAt: new Date().toISOString(),
      },
      executiveContext: {
        systemOverview: isUniversal
          ? "Universal engineering framework applicable across development projects."
          : `System overview for ${repoName}: contains ${request.crawlResult?.eligibleFilesCount || 0} eligible files with ${request.crawlResult?.architecture.modules.length || 0} distinct modules.`,
        techStack: isUniversal
          ? [{ language: "Polyglot / Language Agnostic" }]
          : request.crawlResult?.architecture.languages.map((l) => ({
              language: l.name,
              framework: request.crawlResult?.architecture.frameworks[0],
            })) || [],
        architecturalStyle: isUniversal
          ? "Clean, decoupled component architecture with explicit boundaries."
          : `Modular ${request.crawlResult?.architecture.frameworks.join(", ") || "Standard"} architecture`,
        entryPoints: request.crawlResult?.architecture.entryPoints || [],
      },
      responsibilitiesMatrix: plan.consolidatedDuties,
      workflows: plan.unifiedWorkflows,
      engineeringRules: plan.extractedRules,
      files: [],
    };

    // Render individual files
    const files = this.renderSkillFiles(ir, plan, request);
    ir.files = files;

    // Run deterministic quality evaluation
    const evaluation = this.evaluator.evaluate(ir, request.crawlResult);
    ir.qualityEvaluation = evaluation;

    return {
      ir,
      files,
      evaluation,
      mode: request.mode,
    };
  }

  private renderSkillFiles(
    ir: SkillIntermediateRepresentation,
    plan: ReturnType<PersonaAdaptiveEngine["composePlan"]>,
    request: SkillGenerationRequest
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // 1. Root SKILL.md
    files.push({
      path: "SKILL.md",
      purpose: "Core persona instructions and progressive disclosure index",
      content: this.renderSkillMarkdown(ir, plan, request),
    });

    // 2. references/repository-architecture.md (or universal-architecture.md)
    files.push({
      path: "references/repository-architecture.md",
      purpose: "System structure, component boundaries, and dependency topology",
      content: this.renderArchitectureReference(ir, request),
    });

    // 3. references/coding-conventions.md
    files.push({
      path: "references/coding-conventions.md",
      purpose: "Evidence-backed naming, error handling, and testing conventions",
      content: this.renderConventionsReference(ir, request),
    });

    // 4. references/engineering-guardrails.md
    files.push({
      path: "references/engineering-guardrails.md",
      purpose: "Prohibited patterns, quality gates, and security rules",
      content: this.renderGuardrailsReference(ir, plan),
    });

    // 5. workflows/change-impact-analysis.md
    files.push({
      path: "workflows/change-impact-analysis.md",
      purpose: "Step-by-step impact assessment procedure before modifying code",
      content: this.renderImpactWorkflow(ir),
    });

    // 6. assets/review-checklist.md
    files.push({
      path: "assets/review-checklist.md",
      purpose: "Review checklist with mandatory sign-off criteria",
      content: this.renderReviewChecklist(ir, plan),
    });

    return files;
  }

  private renderSkillMarkdown(
    ir: SkillIntermediateRepresentation,
    plan: ReturnType<PersonaAdaptiveEngine["composePlan"]>,
    request: SkillGenerationRequest
  ): string {
    const lines: string[] = [];

    // Frontmatter
    lines.push("---");
    lines.push(`name: ${ir.metadata.name}`);
    lines.push(`description: ${ir.metadata.description}`);
    lines.push(`version: ${ir.metadata.version}`);
    lines.push(`author: ${ir.metadata.author}`);
    lines.push(`category: ${ir.metadata.category}`);
    lines.push(`tags: [${ir.metadata.tags.map((t) => `"${t}"`).join(", ")}]`);
    lines.push("compatibility:");
    for (const p of ir.metadata.targetPlatforms) {
      lines.push(`  - ${p}`);
    }
    lines.push("---");
    lines.push("");

    // Title & Context
    lines.push(`# ${ir.metadata.name}`);
    lines.push("");
    lines.push(`> **Role:** ${plan.primaryPersona.title} | **Mode:** ${ir.metadata.generationMode.toUpperCase()} | **Personas:** ${plan.personas.map((p) => p.name).join(", ")}`);
    lines.push("");
    lines.push(`## Role & Engineering Identity`);
    lines.push("");
    lines.push(plan.primaryPersona.roleDescription);
    lines.push("");

    // Responsibilities Matrix
    lines.push(`## Persona Responsibilities`);
    lines.push("");
    for (const r of ir.responsibilitiesMatrix) {
      lines.push(`### ${r.personaName}`);
      for (const d of r.coreDuties) {
        lines.push(`- **Duty:** ${d}`);
      }
      lines.push("");
    }

    // Execution Workflows
    lines.push(`## Execution Workflows`);
    lines.push("");
    lines.push(`When working in this repository, follow these workflows in sequence:`);
    lines.push("");
    for (const wf of ir.workflows) {
      lines.push(`### ${wf.title}`);
      lines.push(`*Trigger:* ${wf.trigger}`);
      lines.push("");
      for (const s of wf.steps) {
        lines.push(`${s.stepNumber}. **${s.action}**`);
        lines.push(`   - *Guardrail:* ${s.guardrail}`);
        if (s.evidenceRef) {
          lines.push(`   - *Evidence Ref:* \`${s.evidenceRef}\``);
        }
      }
      lines.push("");
    }

    // Progressive Disclosure Reference Links
    lines.push(`## Progressive Disclosure Reference Guides`);
    lines.push("");
    lines.push(`Consult the following supporting guides when performing deep operations:`);
    lines.push("");
    lines.push(`- [Architecture & Boundaries](references/repository-architecture.md) — Consult when modifying inter-module contracts or adding endpoints.`);
    lines.push(`- [Coding Conventions & Testing](references/coding-conventions.md) — Consult before writing or updating implementation code.`);
    lines.push(`- [Engineering Guardrails](references/engineering-guardrails.md) — Consult to check prohibited actions and security constraints.`);
    lines.push(`- [Change Impact Analysis](workflows/change-impact-analysis.md) — Consult to trace blast-radius before creating diffs.`);
    lines.push(`- [Review Checklist](assets/review-checklist.md) — Consult to verify completion criteria before final sign-off.`);
    lines.push("");

    // Mandatory Quality Gates
    lines.push(`## Mandatory Quality Gates`);
    lines.push("");
    for (const p of plan.personas) {
      for (const g of p.qualityGates) {
        lines.push(`- [ ] **${g}** (${p.name})`);
      }
    }
    lines.push("");

    return lines.join("\n");
  }

  private renderArchitectureReference(
    ir: SkillIntermediateRepresentation,
    request: SkillGenerationRequest
  ): string {
    const lines: string[] = [];
    lines.push(`# Architecture & System Boundaries Reference`);
    lines.push("");
    lines.push(`This document provides evidence-backed architectural context for AI agents working in this codebase.`);
    lines.push("");
    lines.push(`## System Overview`);
    lines.push(ir.executiveContext.systemOverview);
    lines.push("");

    if (request.crawlResult) {
      lines.push(`## Detected Technology Stack`);
      for (const l of request.crawlResult.architecture.languages) {
        lines.push(`- **${l.name}**: ${l.fileCount} files (${l.percentage}%)`);
      }
      lines.push("");

      if (request.crawlResult.architecture.entryPoints.length > 0) {
        lines.push(`## Core Entry Points`);
        for (const ep of request.crawlResult.architecture.entryPoints) {
          lines.push(`- \`${ep}\``);
        }
        lines.push("");
      }

      if (request.crawlResult.architecture.modules.length > 0) {
        lines.push(`## Module Boundaries`);
        lines.push("| Module | Path | Files Count |");
        lines.push("|---|---|---|");
        for (const m of request.crawlResult.architecture.modules.slice(0, 15)) {
          lines.push(`| **${m.name}** | \`${m.path}\` | ${m.filesCount} |`);
        }
        lines.push("");
      }

      if (request.crawlResult.architecture.apiContracts.length > 0) {
        lines.push(`## API & Communication Contracts`);
        for (const api of request.crawlResult.architecture.apiContracts.slice(0, 10)) {
          lines.push(`- \`${api.name}\` (defined in \`${api.path}\`)`);
        }
        lines.push("");
      }
    } else {
      lines.push(`## Universal Architectural Principles`);
      lines.push(`- **Layered Isolation:** Separate transport, business domain, and persistence layers.`);
      lines.push(`- **Contract-First:** Interface definitions precede implementation.`);
      lines.push(`- **Loose Coupling:** Favor composition and dependency injection over global singletons.`);
    }

    return lines.join("\n");
  }

  private renderConventionsReference(
    ir: SkillIntermediateRepresentation,
    request: SkillGenerationRequest
  ): string {
    const lines: string[] = [];
    lines.push(`# Coding Conventions & Testing Standards`);
    lines.push("");

    if (request.crawlResult) {
      const conv = request.crawlResult.conventions;
      lines.push(`## Error Handling`);
      lines.push(`- **Pattern:** ${conv.errorHandlingPattern}`);
      lines.push("");
      lines.push(`## Logging Practices`);
      lines.push(`- **Pattern:** ${conv.loggingPattern}`);
      lines.push("");
      lines.push(`## Testing Framework & Conventions`);
      for (const t of conv.testingPractices) {
        lines.push(`- **Framework:** ${t.framework}`);
        lines.push(`- **Convention:** ${t.pattern} (${t.testFilesCount} existing test files)`);
      }
      lines.push("");
      lines.push(`## Naming Conventions`);
      for (const n of conv.namingConventions) {
        lines.push(`- **${n.target}:** ${n.pattern} (e.g., \`${n.examples.join("`, `")}\`)`);
      }
    } else {
      lines.push(`## Universal Conventions`);
      lines.push(`- Follow standard naming: PascalCase for types/classes, camelCase for variables/functions.`);
      lines.push(`- Wrap asynchronous external operations in explicit try-catch blocks with descriptive error envelopes.`);
      lines.push(`- Write deterministic unit tests for all domain logic.`);
    }

    return lines.join("\n");
  }

  private renderGuardrailsReference(
    ir: SkillIntermediateRepresentation,
    plan: ReturnType<PersonaAdaptiveEngine["composePlan"]>
  ): string {
    const lines: string[] = [];
    lines.push(`# Engineering Guardrails & Prohibited Actions`);
    lines.push("");
    lines.push(`The following guardrails are strictly enforced during code modifications:`);
    lines.push("");

    lines.push(`## Extracted Engineering Rules`);
    for (const r of ir.engineeringRules) {
      lines.push(`### [${r.ruleId}] ${r.category}: ${r.directive}`);
      lines.push(`- **Rationale:** ${r.rationale}`);
      if (r.evidenceFindingId) {
        lines.push(`- **Evidence Ref:** \`${r.evidenceFindingId}\``);
      }
      lines.push(`- **Prohibited:** ${r.prohibitedPatterns.join("; ")}`);
      lines.push("");
    }

    lines.push(`## Prohibited Actions by Persona`);
    for (const p of plan.personas) {
      lines.push(`### ${p.name}`);
      for (const pa of p.prohibitedActions) {
        lines.push(`- 🚫 **${pa}**`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  private renderImpactWorkflow(ir: SkillIntermediateRepresentation): string {
    const lines: string[] = [];
    lines.push(`# Change Impact Analysis Workflow`);
    lines.push("");
    lines.push(`Execute these steps before writing or modifying any production code:`);
    lines.push("");
    lines.push(`1. **Identify Target Modules & Callers**`);
    lines.push(`   - Search for all callers and importers of the target function, class, or route.`);
    lines.push(`   - Verify whether public contracts or database schemas are modified.`);
    lines.push("");
    lines.push(`2. **Evaluate Blast Radius**`);
    lines.push(`   - Could dependent modules crash or exhibit subtle behavior changes?`);
    lines.push(`   - Are asynchronous race conditions or timeout hazards introduced?`);
    lines.push("");
    lines.push(`3. **Security & Input Boundary Check**`);
    lines.push(`   - Ensure any incoming user arguments are parsed against a strict schema.`);
    lines.push(`   - Redact all tokens, credentials, or sensitive attributes from logs.`);
    lines.push("");
    lines.push(`4. **Regression Verification Plan**`);
    lines.push(`   - Formulate targeted unit test cases covering edge and error states.`);
    lines.push(`   - Run existing regression suites before considering the task complete.`);
    lines.push("");

    return lines.join("\n");
  }

  private renderReviewChecklist(
    ir: SkillIntermediateRepresentation,
    plan: ReturnType<PersonaAdaptiveEngine["composePlan"]>
  ): string {
    const lines: string[] = [];
    lines.push(`# Persona Review & Sign-Off Checklist`);
    lines.push("");
    lines.push(`Before submitting code changes, verify that each question below is satisfied:`);
    lines.push("");

    for (const p of plan.personas) {
      lines.push(`## ${p.name} Review Questions`);
      for (const q of p.mandatoryReviewQuestions) {
        lines.push(`- [ ] **${q}**`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}
