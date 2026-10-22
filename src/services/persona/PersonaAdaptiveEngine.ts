import {
  PersonaId,
  EngineeringPersona,
  CrawlResult,
  EvidenceFinding,
  SkillIntermediateRepresentation,
} from "../../domain/persona/types";
import { getPersonaById, BUILTIN_PERSONAS } from "../../domain/persona/catalog";

export interface ComposedPersonaPlan {
  personas: EngineeringPersona[];
  primaryPersona: EngineeringPersona;
  prioritizedFindings: EvidenceFinding[];
  filteredFindings: EvidenceFinding[];
  consolidatedDuties: {
    personaId: PersonaId;
    personaName: string;
    coreDuties: string[];
    reviewCheckpoints: string[];
    prohibitedActions: string[];
  }[];
  unifiedWorkflows: {
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
  extractedRules: {
    ruleId: string;
    category: string;
    directive: string;
    rationale: string;
    evidenceFindingId?: string;
    prohibitedPatterns: string[];
  }[];
}

export class PersonaAdaptiveEngine {
  /**
   * Plans and harmonizes persona guidance for either Universal Mode or Repository-Adaptive Mode.
   */
  public composePlan(
    selectedPersonaIds: PersonaId[],
    crawlResult?: CrawlResult,
    customRules?: string[]
  ): ComposedPersonaPlan {
    const validPersonas: EngineeringPersona[] = selectedPersonaIds
      .map((id) => getPersonaById(id))
      .filter((p): p is EngineeringPersona => p !== undefined);

    if (validPersonas.length === 0) {
      // Default to Developer if none provided
      validPersonas.push(BUILTIN_PERSONAS[0]);
    }

    const primaryPersona = validPersonas[0];
    const allFindings = crawlResult?.findings || [];

    // Filter and score findings based on selected personas
    const prioritizedFindings: EvidenceFinding[] = [];
    for (const f of allFindings) {
      const isRelevant = validPersonas.some((p) => f.personaRelevance.includes(p.id));
      if (isRelevant) {
        prioritizedFindings.push(f);
      }
    }

    // Consolidated duties per persona (no duplicates)
    const consolidatedDuties = validPersonas.map((p) => ({
      personaId: p.id,
      personaName: p.name,
      coreDuties: p.responsibilities.slice(0, 4),
      reviewCheckpoints: p.mandatoryReviewQuestions.slice(0, 4),
      prohibitedActions: p.prohibitedActions.slice(0, 3),
    }));

    // Multi-persona unified workflow synthesis
    const unifiedWorkflows = this.synthesizeUnifiedWorkflows(validPersonas, crawlResult, prioritizedFindings);

    // Rule extraction from persona decision principles and repository findings
    const extractedRules = this.extractEngineeringRules(validPersonas, prioritizedFindings, customRules);

    return {
      personas: validPersonas,
      primaryPersona,
      prioritizedFindings,
      filteredFindings: allFindings.filter((f) => !prioritizedFindings.includes(f)),
      consolidatedDuties,
      unifiedWorkflows,
      extractedRules,
    };
  }

  private synthesizeUnifiedWorkflows(
    personas: EngineeringPersona[],
    crawlResult?: CrawlResult,
    findings?: EvidenceFinding[]
  ): ComposedPersonaPlan["unifiedWorkflows"] {
    const workflows: ComposedPersonaPlan["unifiedWorkflows"] = [];
    const hasArchitectOrPrincipal = personas.some((p) => ["principal-engineer", "software-architect"].includes(p.id));
    const hasSecurity = personas.some((p) => p.id === "security-engineer");
    const hasSre = personas.some((p) => p.id === "sre-reliability-engineer");
    const hasDeveloper = personas.some((p) => ["developer", "senior-developer"].includes(p.id));

    // Workflow 1: Feature & Modification Lifecycle (Coherent Multi-Persona Sequential Pipeline)
    const steps: {
      stepNumber: number;
      action: string;
      guardrail: string;
      evidenceRef?: string;
    }[] = [];

    let stepNum = 1;

    // Step 1: Architectural Assessment (if Architect / Principal selected)
    if (hasArchitectOrPrincipal) {
      const archFinding = findings?.find((f) => f.category === "architecture");
      steps.push({
        stepNumber: stepNum++,
        action: "Evaluate change impact on module boundaries and existing contracts",
        guardrail: "Ensure unidirectional dependencies and avoid circular couplings",
        evidenceRef: archFinding?.id,
      });
    }

    // Step 2: Threat & Security Verification (if Security Engineer selected)
    if (hasSecurity) {
      const secFinding = findings?.find((f) => f.category === "security");
      steps.push({
        stepNumber: stepNum++,
        action: "Analyze trust boundaries, validate inputs, and audit credentials",
        guardrail: "Never permit raw string concatenation in queries or commands; redact secrets",
        evidenceRef: secFinding?.id,
      });
    }

    // Step 3: Implementation & Local Conventions (if Developer / Senior selected, or default)
    if (hasDeveloper || steps.length === 0) {
      const convFinding = findings?.find((f) => f.category === "convention");
      steps.push({
        stepNumber: stepNum++,
        action: "Implement targeted changes following established code conventions",
        guardrail: "Adhere strictly to project naming, formatting, and file organization",
        evidenceRef: convFinding?.id,
      });
      steps.push({
        stepNumber: stepNum++,
        action: "Write corresponding unit and integration tests",
        guardrail: "Zero untested error conditions or modified public exports",
      });
    }

    // Step 4: Reliability & Observability (if SRE selected)
    if (hasSre) {
      steps.push({
        stepNumber: stepNum++,
        action: "Verify timeouts, retry policies, and structured telemetry logging",
        guardrail: "All network and storage operations must configure bounded timeouts",
      });
    }

    // Step 5: Verification & Gate Review
    steps.push({
      stepNumber: stepNum++,
      action: "Execute complete test suite, linter, and type checks",
      guardrail: "All automated quality gates must pass before submitting changes",
    });

    workflows.push({
      id: "feature-lifecycle-workflow",
      title: "Coherent Change Implementation & Review Workflow",
      trigger: "Invoked when planning, implementing, or reviewing code changes in this workspace",
      steps,
      mandatoryGates: [
        "Architectural contract preservation",
        "Zero high/critical security vulnerabilities or secrets leakage",
        "Passing unit & regression test suite",
        "Code review sign-off matching persona guidelines",
      ],
    });

    // Workflow 2: Architecture Review (for Architect/Principal)
    if (hasArchitectOrPrincipal) {
      workflows.push({
        id: "architecture-review-workflow",
        title: "Architectural Decision & Impact Assessment",
        trigger: "Invoked when introducing new services, modifying data schemas, or altering API contracts",
        steps: [
          {
            stepNumber: 1,
            action: "Trace dependency graphs and consumer modules",
            guardrail: "Do not accept breaking API changes without deprecation windows",
          },
          {
            stepNumber: 2,
            action: "Formulate Architectural Decision Record (ADR) documenting alternatives and trade-offs",
            guardrail: "Explicitly document scalability limits and failure modes",
          },
        ],
        mandatoryGates: ["ADR document presence", "Backward compatibility guarantee"],
      });
    }

    // Workflow 3: Security & Trust Boundary Review (for Security)
    if (hasSecurity) {
      workflows.push({
        id: "security-audit-workflow",
        title: "Trust Boundary & Vulnerability Review",
        trigger: "Invoked when implementing authentication, database queries, or external endpoints",
        steps: [
          {
            stepNumber: 1,
            action: "Map all external inputs and enforce strict allowlist schemas",
            guardrail: "Untrusted input must never reach shell or DB unescaped",
          },
          {
            stepNumber: 2,
            action: "Scrub and verify secrets management",
            guardrail: "No credentials or private keys committed to source or logs",
          },
        ],
        mandatoryGates: ["Input validation on all boundaries", "Zero hardcoded credentials"],
      });
    }

    return workflows;
  }

  private extractEngineeringRules(
    personas: EngineeringPersona[],
    findings: EvidenceFinding[],
    customRules?: string[]
  ): ComposedPersonaPlan["extractedRules"] {
    const rules: ComposedPersonaPlan["extractedRules"] = [];
    let ruleIdx = 1;

    // Rule from findings
    for (const f of findings.slice(0, 10)) {
      rules.push({
        ruleId: `RULE-${String(ruleIdx++).padStart(3, "0")}`,
        category: f.category.toUpperCase(),
        directive: f.recommendedInstruction,
        rationale: f.description,
        evidenceFindingId: f.id,
        prohibitedPatterns: [
          `Do not violate the patterns observed in ${f.filePath}`,
          "Do not bypass established module validation",
        ],
      });
    }

    // Persona-specific baseline rules
    for (const p of personas) {
      for (const dp of p.decisionPrinciples.slice(0, 2)) {
        rules.push({
          ruleId: `RULE-${String(ruleIdx++).padStart(3, "0")}`,
          category: p.name.toUpperCase(),
          directive: dp,
          rationale: `Mandated by the ${p.title} persona guidelines.`,
          prohibitedPatterns: p.prohibitedActions.slice(0, 2),
        });
      }
    }

    // Custom organizational rules if user provided
    if (customRules && customRules.length > 0) {
      for (const cr of customRules) {
        if (cr.trim()) {
          rules.push({
            ruleId: `RULE-${String(ruleIdx++).padStart(3, "0")}`,
            category: "ORGANIZATION",
            directive: cr.trim(),
            rationale: "Explicit organization requirement configured by the engineer.",
            prohibitedPatterns: ["Violating custom organizational directives"],
          });
        }
      }
    }

    return rules;
  }
}
