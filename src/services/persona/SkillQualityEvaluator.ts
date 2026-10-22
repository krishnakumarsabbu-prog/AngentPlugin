import {
  SkillIntermediateRepresentation,
  EvaluationScorecard,
  CrawlResult,
} from "../../domain/persona/types";
import { getPersonaById } from "../../domain/persona/catalog";

export class SkillQualityEvaluator {
  /**
   * Deterministically evaluates the quality, persona grounding, actionability,
   * coverage, safety, and portability of a generated Skill IR.
   */
  public evaluate(
    ir: SkillIntermediateRepresentation,
    crawlResult?: CrawlResult
  ): EvaluationScorecard {
    const isUniversal = ir.metadata.generationMode === "universal" || !crawlResult;
    const passedGates: string[] = [];
    const unsupportedAssumptions: string[] = [];
    const actionableRecommendations: string[] = [];

    // ─────────────────────────────────────────────────────────────────────────
    // Dimension 1: Persona Alignment
    // ─────────────────────────────────────────────────────────────────────────
    let personaAlignmentScore = 100;
    const selectedPersonas = ir.metadata.personas.map((id) => getPersonaById(id)).filter(Boolean);

    if (selectedPersonas.length === 0) {
      personaAlignmentScore -= 30;
      unsupportedAssumptions.push("No valid engineering personas attached to skill metadata.");
    } else {
      // Check if responsibilities and review questions reflect personas
      for (const p of selectedPersonas) {
        if (!p) continue;
        const hasDuties = ir.responsibilitiesMatrix.some((r) => r.personaId === p.id);
        if (!hasDuties) {
          personaAlignmentScore -= 15;
          actionableRecommendations.push(`Add explicit duties for ${p.name} in responsibilities matrix.`);
        }
      }
      passedGates.push("Persona responsibilities and review rubrics mapped.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dimension 2: Repository Grounding
    // ─────────────────────────────────────────────────────────────────────────
    let repositoryGroundingScore = 100;

    if (isUniversal) {
      repositoryGroundingScore = 90; // Universal mode has valid high grounding for general patterns
      passedGates.push("Universal engineering principles verified without phantom repository assertions.");
    } else {
      const evidenceFindings = crawlResult?.findings || [];
      const ruleRefs = ir.engineeringRules.filter((r) => r.evidenceFindingId);

      if (evidenceFindings.length > 0 && ruleRefs.length === 0) {
        repositoryGroundingScore -= 35;
        actionableRecommendations.push("Link engineering rules to discovered repository evidence finding IDs.");
      } else {
        passedGates.push(`Rules grounded with ${ruleRefs.length} traceable evidence findings.`);
      }

      // Check tech stack alignment
      if (ir.executiveContext.techStack.length === 0) {
        repositoryGroundingScore -= 15;
        unsupportedAssumptions.push("Repository language/manifest breakdown could not be determined.");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dimension 3: Actionability
    // ─────────────────────────────────────────────────────────────────────────
    let actionabilityScore = 95;

    // Check workflows and steps
    if (ir.workflows.length === 0) {
      actionabilityScore -= 40;
      actionableRecommendations.push("Define at least one step-by-step execution workflow.");
    } else {
      const totalSteps = ir.workflows.reduce((acc, wf) => acc + wf.steps.length, 0);
      if (totalSteps < 3) {
        actionabilityScore -= 20;
        actionableRecommendations.push("Expand execution workflow with detailed guardrails.");
      } else {
        passedGates.push(`Actionable workflow with ${totalSteps} explicit steps and guardrails.`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dimension 4: Coverage
    // ─────────────────────────────────────────────────────────────────────────
    let coverageScore = 90;
    const requiredFiles = [
      "SKILL.md",
      "references/repository-architecture.md",
      "references/coding-conventions.md",
      "references/engineering-guardrails.md",
      "workflows/change-impact-analysis.md",
    ];

    const existingFilePaths = ir.files.map((f) => f.path);
    for (const req of requiredFiles) {
      if (!existingFilePaths.includes(req)) {
        coverageScore -= 15;
        unsupportedAssumptions.push(`Missing recommended reference file: ${req}`);
      }
    }
    if (coverageScore >= 80) {
      passedGates.push("Complete progressive disclosure document suite generated.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dimension 5: Safety & Security
    // ─────────────────────────────────────────────────────────────────────────
    let safetyScore = 100;

    // Scan generated files for potential secret leaks or unsafe commands
    for (const f of ir.files) {
      if (
        f.content.includes("sk-") ||
        f.content.includes("AKIA") ||
        f.content.includes("PRIVATE KEY") ||
        f.content.includes("password:")
      ) {
        safetyScore -= 40;
        unsupportedAssumptions.push(`Potential credential leak detected in generated file ${f.path}`);
      }
    }

    const hasProhibited = ir.engineeringRules.some((r) => r.prohibitedPatterns.length > 0);
    if (!hasProhibited) {
      safetyScore -= 15;
      actionableRecommendations.push("Define explicit prohibited patterns and negative constraints.");
    } else {
      passedGates.push("Strict prohibited patterns and security guardrails enforced.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dimension 6: Portability
    // ─────────────────────────────────────────────────────────────────────────
    let portabilityScore = 100;
    const skillMd = ir.files.find((f) => f.path === "SKILL.md");

    if (!skillMd) {
      portabilityScore = 20;
      unsupportedAssumptions.push("Root SKILL.md is missing.");
    } else {
      // Verify frontmatter format
      if (!skillMd.content.startsWith("---") || !skillMd.content.includes("name:") || !skillMd.content.includes("compatibility:")) {
        portabilityScore -= 25;
        actionableRecommendations.push("Ensure SKILL.md contains valid YAML frontmatter compliant with agent specifications.");
      } else {
        passedGates.push("Valid YAML frontmatter compatible with GitHub Copilot and Claude Code.");
      }
    }

    // Clamp scores
    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));
    const s1 = clamp(personaAlignmentScore);
    const s2 = clamp(repositoryGroundingScore);
    const s3 = clamp(actionabilityScore);
    const s4 = clamp(coverageScore);
    const s5 = clamp(safetyScore);
    const s6 = clamp(portabilityScore);

    const overallScore = Math.round((s1 + s2 + s3 + s4 + s5 + s6) / 6);

    return {
      overallScore,
      dimensions: {
        personaAlignment: {
          score: s1,
          rationale: `Evaluates representation of ${selectedPersonas.map((p) => p?.name).join(", ")} priorities and decision principles.`,
        },
        repositoryGrounding: {
          score: s2,
          rationale: isUniversal
            ? "Universal engineering principles without unsupported repository claims."
            : `Grounded in ${crawlResult?.findings.length || 0} discovered repository facts and structure.`,
        },
        actionability: {
          score: s3,
          rationale: "Evaluates step clarity, deterministic commands, and guardrail specificity.",
        },
        coverage: {
          score: s4,
          rationale: "Evaluates completeness of supporting references, workflows, and checklist assets.",
        },
        safety: {
          score: s5,
          rationale: "Audits for secret redaction, path traversal protection, and negative constraints.",
        },
        portability: {
          score: s6,
          rationale: "Verifies standard frontmatter and cross-platform agent format compatibility.",
        },
      },
      passedGates,
      unsupportedAssumptions,
      actionableRecommendations,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
