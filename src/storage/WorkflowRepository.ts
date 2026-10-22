import { Workflow, WorkflowSummary, WorkflowNode, WorkflowEdge } from "../domain/workflows/types";
import { validateWorkflow, WorkflowValidationOptions } from "../workflows/WorkflowValidator";

export interface WorkflowPersistence {
  loadWorkflows(): Workflow[];
  saveWorkflows(workflows: Workflow[]): void;
}

export class WorkflowRepository {
  constructor(
    private persistence: WorkflowPersistence,
    private validatorOptions?: () => WorkflowValidationOptions
  ) {}

  async list(): Promise<Workflow[]> {
    return [...this.persistence.loadWorkflows()];
  }

  async summaries(): Promise<WorkflowSummary[]> {
    const workflows = await this.list();
    return workflows.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      status: w.status,
      version: w.version,
      nodeCount: w.nodes?.length || 0,
      updatedAt: w.updatedAt,
    }));
  }

  async get(id: string): Promise<Workflow | undefined> {
    const workflows = await this.list();
    return workflows.find((w) => w.id === id);
  }

  async create(input: Partial<Workflow>, options?: { allowInvalid?: boolean }): Promise<Workflow> {
    const name = (input.name ?? "").trim();
    if (!name) {
      throw new Error("Workflow name is required");
    }

    const workflows = await this.list();
    const id = input.id && input.id.trim() ? input.id.trim() : this.uniqueId(name, workflows);
    if (workflows.some((w) => w.id === id)) {
      throw new Error(`Workflow id already exists: ${id}`);
    }

    const now = new Date().toISOString();
    const workflow: Workflow = {
      id,
      name,
      description: (input.description ?? "").trim(),
      version: (input.version ?? "1.0.0").trim(),
      nodes: Array.isArray(input.nodes) ? [...input.nodes] : this.defaultNodes(),
      edges: Array.isArray(input.edges) ? [...input.edges] : this.defaultEdges(),
      executionSettings: input.executionSettings ?? {
        maxParallelNodes: 2,
        retryPolicy: { maxRetries: 2, backoffSeconds: 5 },
        requireApprovalFor: [],
      },
      status: input.status ?? "Draft",
      createdAt: now,
      updatedAt: now,
    };

    if (!options?.allowInvalid) {
      const vOptions = this.validatorOptions ? this.validatorOptions() : undefined;
      const report = validateWorkflow(workflow, vOptions);
      if (!report.valid) {
        throw new Error(`Cannot persist invalid workflow: ${report.errors.map((e) => e.message).join("; ")}`);
      }
    }

    this.persistence.saveWorkflows([workflow, ...workflows]);
    return workflow;
  }

  async update(id: string, patch: Partial<Workflow>, options?: { allowInvalid?: boolean }): Promise<Workflow> {
    const workflows = await this.list();
    const idx = workflows.findIndex((w) => w.id === id);
    if (idx === -1) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const existing = workflows[idx];
    const name = patch.name !== undefined ? patch.name.trim() : existing.name;
    if (!name) {
      throw new Error("Workflow name cannot be empty");
    }

    const updated: Workflow = {
      ...existing,
      ...patch,
      id: existing.id,
      name,
      description: patch.description !== undefined ? patch.description.trim() : existing.description,
      version: patch.version !== undefined ? patch.version.trim() : existing.version,
      nodes: patch.nodes !== undefined ? [...patch.nodes] : existing.nodes,
      edges: patch.edges !== undefined ? [...patch.edges] : existing.edges,
      executionSettings: patch.executionSettings
        ? { ...existing.executionSettings, ...patch.executionSettings }
        : existing.executionSettings,
      status: patch.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    };

    if (!options?.allowInvalid) {
      const vOptions = this.validatorOptions ? this.validatorOptions() : undefined;
      const report = validateWorkflow(updated, vOptions);
      if (!report.valid) {
        throw new Error(`Cannot persist invalid workflow: ${report.errors.map((e) => e.message).join("; ")}`);
      }
    }

    workflows[idx] = updated;
    this.persistence.saveWorkflows(workflows);
    return updated;
  }

  async duplicate(id: string): Promise<Workflow> {
    const original = await this.get(id);
    if (!original) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const workflows = await this.list();
    const copyName = `${original.name} (Copy)`;
    const copyId = this.uniqueId(copyName, workflows);
    const now = new Date().toISOString();

    const clone: Workflow = {
      ...original,
      id: copyId,
      name: copyName,
      status: "Draft",
      nodes: original.nodes.map((n) => ({ ...n, position: { ...n.position } })),
      edges: original.edges.map((e) => ({ ...e })),
      executionSettings: { ...original.executionSettings },
      createdAt: now,
      updatedAt: now,
    };

    this.persistence.saveWorkflows([clone, ...workflows]);
    return clone;
  }

  async delete(id: string): Promise<void> {
    const workflows = await this.list();
    const filtered = workflows.filter((w) => w.id !== id);
    if (filtered.length === workflows.length) {
      throw new Error(`Workflow not found: ${id}`);
    }
    this.persistence.saveWorkflows(filtered);
  }

  private uniqueId(name: string, existing: Workflow[]): string {
    const base = `wf-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "pipeline"}`;
    let candidate = base;
    let n = 2;
    while (existing.some((w) => w.id === candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    return candidate;
  }

  private defaultNodes(): WorkflowNode[] {
    return [
      {
        id: "start-1",
        type: "start",
        name: "Start",
        configuration: {},
        position: { x: 100, y: 150 },
      },
      {
        id: "end-1",
        type: "end",
        name: "End",
        configuration: {},
        position: { x: 500, y: 150 },
      },
    ];
  }

  private defaultEdges(): WorkflowEdge[] {
    return [
      {
        id: "e-start-end",
        source: "start-1",
        target: "end-1",
      },
    ];
  }
}
