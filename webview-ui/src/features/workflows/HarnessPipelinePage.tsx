import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from "@xyflow/react";
import { WorkflowHeader } from "./WorkflowHeader";
import { NodePalette } from "./NodePalette";
import { PropertiesSidebar } from "./PropertiesSidebar";
import { ValidationModal } from "./ValidationModal";
import { WorkflowListPage } from "./WorkflowListPage";
import { PipelineNode } from "./PipelineNode";
import { getNodeDefinition } from "./nodeDefinitions";
import { workflowsService } from "../../services/workflowsService";
import { exportWorkflowPackage, parseWorkflowPackage } from "../../services/workflowFormat";
import { executionsService } from "../../services/executionsService";
import { ExecutionDrawer } from "./ExecutionDrawer";
import { DeletableEdge } from "./DeletableEdge";
import { RunPipelineMarkdownModal } from "./RunPipelineMarkdownModal";
import { generatePipelineMarkdown } from "../../services/pipelineMarkdownService";
import { getAgentsStore } from "../../services/agentsService";
import { getSkillsStore } from "../../services/skillsService";
import { sendRequest, hasVsCodeApi } from "../../services/vscodeApi";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
} from "lucide-react";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
  WorkflowValidationReport,
  ExecutionRecord,
} from "../../types";
import "./workflows.css";

interface HarnessPipelinePageProps {
  initialWorkflowId?: string;
  onToast: (message: string, tone?: "success" | "info" | "warning" | "error") => void;
  onNavigate?: (route: string) => void;
  route?: string;
  navSignal?: number;
}

const FlowCanvas: React.FC<{
  workflow: Workflow;
  onWorkflowChange: (updater: (prev: Workflow) => Workflow) => void;
  selectedNodeId: string | null;
  onSelectNodeId: (id: string | null) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
  executionRecord: ExecutionRecord | null;
  onApproveNode?: (nodeId: string) => void;
  onRejectNode?: (nodeId: string) => void;
  isPaletteCollapsed: boolean;
  onTogglePalette: () => void;
  isSettingsCollapsed: boolean;
  onToggleSettings: () => void;
}> = ({
  workflow,
  onWorkflowChange,
  selectedNodeId,
  onSelectNodeId,
  onDeleteNode,
  onDeleteEdge,
  executionRecord,
  onApproveNode,
  onRejectNode,
  isPaletteCollapsed,
  onTogglePalette,
  isSettingsCollapsed,
  onToggleSettings,
}) => {
  const reactFlowInstance = useReactFlow();

  const edgeTypes = useMemo(
    () => ({
      default: DeletableEdge,
      deletable: DeletableEdge,
    }),
    []
  );

  // Convert domain nodes to ReactFlow nodes
  const initialNodes: Node[] = useMemo(() => {
    return (workflow.nodes || []).map((n) => {
      const nodeExec = executionRecord?.nodeExecutions.find((ne) => ne.nodeId === n.id);
      return {
        id: n.id,
        type: n.type,
        position: n.position || { x: 100, y: 100 },
        data: {
          label: n.name,
          type: n.type,
          description: n.description,
          configuration: n.configuration,
          executionState: nodeExec
            ? {
                status: nodeExec.status,
                summary: nodeExec.summary,
                durationMs: nodeExec.durationMs,
                error: nodeExec.error,
                approvalStatus: nodeExec.approvalStatus,
              }
            : undefined,
          onApproveNode,
          onRejectNode,
          onDeleteNode,
        },
        selected: n.id === selectedNodeId,
      };
    });
  }, [workflow.nodes, selectedNodeId, onDeleteNode, executionRecord, onApproveNode, onRejectNode]);

  // Convert domain edges to ReactFlow edges
  const initialEdges: Edge[] = useMemo(() => {
    return (workflow.edges || []).map((e) => {
      const isApproved = e.sourceHandle === "approved" || e.sourceHandle === "true";
      const isRejected = e.sourceHandle === "rejected" || e.sourceHandle === "false";
      const stroke = isApproved ? "#10B981" : isRejected ? "#EF4444" : "#64748B";
      const label =
        e.label ||
        (e.sourceHandle && e.sourceHandle !== "source"
          ? e.sourceHandle.charAt(0).toUpperCase() + e.sourceHandle.slice(1)
          : undefined);

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined,
        label,
        animated: true,
        type: "deletable",
        data: {
          onDeleteEdge: (edgeId: string) => {
            if (onDeleteEdge) {
              onDeleteEdge(edgeId);
            } else {
              onWorkflowChange((prev) => ({
                ...prev,
                edges: (prev.edges || []).filter((edge) => edge.id !== edgeId),
              }));
            }
          },
        },
        style: { stroke, strokeWidth: isApproved || isRejected ? 2 : 1.5 },
      };
    });
  }, [workflow.edges, onDeleteEdge, onWorkflowChange]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync edge deletions from keyboard Backspace/Delete key
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      const idsToDelete = new Set(deletedEdges.map((e) => e.id));
      onWorkflowChange((prev) => ({
        ...prev,
        edges: (prev.edges || []).filter((e) => !idsToDelete.has(e.id)),
      }));
    },
    [onWorkflowChange]
  );

  // Handle edge removal changes
  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      const removedIds = changes
        .filter((c: any) => c.type === "remove")
        .map((c: any) => c.id);
      if (removedIds.length > 0) {
        const idSet = new Set(removedIds);
        onWorkflowChange((prev) => ({
          ...prev,
          edges: (prev.edges || []).filter((e) => !idSet.has(e.id)),
        }));
      }
    },
    [onEdgesChange, onWorkflowChange]
  );

  // Sync external workflow changes into ReactFlow nodes/edges
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Smoothly center and focus camera when selectedNodeId changes (e.g., from validation finding)
  useEffect(() => {
    if (!selectedNodeId) return;
    const targetNode = workflow.nodes.find((n) => n.id === selectedNodeId);
    if (targetNode?.position) {
      reactFlowInstance.setCenter(
        targetNode.position.x + 90,
        targetNode.position.y + 40,
        { zoom: 1.05, duration: 400 }
      );
    }
  }, [selectedNodeId, workflow.nodes, reactFlowInstance]);

  // Node type registration
  const nodeTypes = useMemo(
    () => ({
      start: PipelineNode,
      requirement_input: PipelineNode,
      skill_invocation: PipelineNode,
      agent_execution: PipelineNode,
      planning: PipelineNode,
      human_approval: PipelineNode,
      condition_branch: PipelineNode,
      context_handoff: PipelineNode,
      parallel_execution: PipelineNode,
      merge_results: PipelineNode,
      validation: PipelineNode,
      retry: PipelineNode,
      artifact_output: PipelineNode,
      end: PipelineNode,
      agent: PipelineNode,
      skill: PipelineNode,
      input: PipelineNode,
      output: PipelineNode,
      approval: PipelineNode,
      handoff: PipelineNode,
      decision: PipelineNode,
    }),
    []
  );

  // Sync edge additions
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      const newEdgeId = `e-${params.source}-${params.target}-${Date.now().toString(36).slice(2, 6)}`;
      const sourceHandle = params.sourceHandle || undefined;
      const targetHandle = params.targetHandle || undefined;
      const label =
        sourceHandle && sourceHandle !== "source"
          ? sourceHandle.charAt(0).toUpperCase() + sourceHandle.slice(1)
          : undefined;

      const newEdge: WorkflowEdge = {
        id: newEdgeId,
        source: params.source,
        target: params.target,
        sourceHandle,
        targetHandle,
        label,
      };

      onWorkflowChange((prev) => ({
        ...prev,
        edges: [...prev.edges, newEdge],
      }));
    },
    [onWorkflowChange]
  );

  // Handle Drag & Drop from Palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow") as WorkflowNodeType;
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const def = getNodeDefinition(type);
      const uniqueSuffix = Date.now().toString(36).slice(2, 6);
      const newNodeId = `node-${type.replace(/_/g, "-")}-${uniqueSuffix}`;

      const newNode: WorkflowNode = {
        id: newNodeId,
        type,
        name: def.defaultName,
        description: def.description,
        configuration: { ...def.defaultConfig },
        position,
      };

      onWorkflowChange((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newNode],
      }));

      onSelectNodeId(newNodeId);
    },
    [reactFlowInstance, onWorkflowChange, onSelectNodeId]
  );

  // Sync node position dragging back to workflow domain object
  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      onWorkflowChange((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === node.id ? { ...n, position: node.position } : n)),
      }));
    },
    [onWorkflowChange]
  );

  return (
    <div className="canvas-container" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_, node) => onSelectNodeId(node.id)}
        onPaneClick={() => onSelectNodeId(null)}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        minZoom={0.2}
        maxZoom={2.0}
      >
        <Background gap={16} size={1} color="#CBD5E1" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const def = getNodeDefinition(n.type || "");
            return def.color || "#64748B";
          }}
          zoomable
          pannable
          style={{ height: 110, width: 140 }}
        />
        <Panel position="top-left" style={{ display: "flex", gap: 6, margin: 10 }}>
          <button
            className="canvas-float-pill"
            onClick={onTogglePalette}
            title={isPaletteCollapsed ? "Expand Node Palette (Alt+[)" : "Minimize Node Palette (Alt+[)"}
          >
            {isPaletteCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
            <span>{isPaletteCollapsed ? "Expand Palette" : "Minimize Palette"}</span>
          </button>
        </Panel>
        <Panel position="top-right" style={{ display: "flex", gap: 6, margin: 10 }}>
          <button
            className="canvas-float-pill"
            onClick={() => reactFlowInstance.fitView({ padding: 0.2, duration: 400 })}
            title="Fit graph to view"
          >
            <Maximize2 size={13} />
            <span>Fit View</span>
          </button>
          <button
            className="canvas-float-pill"
            onClick={onToggleSettings}
            title={isSettingsCollapsed ? "Expand Settings Panel (Alt+])" : "Minimize Settings Panel (Alt+])"}
          >
            {isSettingsCollapsed ? <PanelRightOpen size={13} /> : <PanelRightClose size={13} />}
            <span>{isSettingsCollapsed ? "Expand Settings" : "Minimize Settings"}</span>
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const HarnessPipelinePage: React.FC<HarnessPipelinePageProps> = ({
  initialWorkflowId,
  onToast,
  onNavigate,
  route,
  navSignal,
}) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false);
  const [isSettingsCollapsed, setIsSettingsCollapsed] = useState(false);
  const [isListView, setIsListView] = useState(!initialWorkflowId);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationReport, setValidationReport] = useState<WorkflowValidationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keyboard shortcut listener: Alt+[ toggles palette, Alt+] toggles properties
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.altKey && (e.key === "[" || e.code === "BracketLeft")) {
        e.preventDefault();
        setIsPaletteCollapsed((c) => !c);
      } else if (e.altKey && (e.key === "]" || e.code === "BracketRight")) {
        e.preventDefault();
        setIsSettingsCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Selecting a node automatically expands properties sidebar for immediate editing
  const handleSelectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
    if (id) {
      setIsSettingsCollapsed(false);
    }
  }, []);

  // Whenever navSignal increments, return to the pipeline dashboard view
  useEffect(() => {
    if (navSignal !== undefined && navSignal > 0) {
      setIsListView(true);
    }
  }, [navSignal]);

  // Handle route changes
  useEffect(() => {
    if (route === "harness-pipeline") {
      setIsListView(true);
    } else if (route?.startsWith("pipeline-canvas:")) {
      const targetId = route.slice("pipeline-canvas:".length);
      const matched = workflows.find((w) => w.id === targetId);
      if (matched) {
        setActiveWorkflow(matched);
      }
      setIsListView(false);
    }
  }, [route, workflows]);

  // Load saved workflows on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const list = await workflowsService.list();
        if (!mounted) return;
        setWorkflows(list);
        if (list.length > 0) {
          const matched = initialWorkflowId ? list.find((w) => w.id === initialWorkflowId) : null;
          setActiveWorkflow(matched || list[0]);
          if (initialWorkflowId && matched) {
            setIsListView(false);
          } else {
            setIsListView(true);
          }
        } else {
          setActiveWorkflow(null);
          setIsListView(true);
        }
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Failed to load workflows", "error");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [initialWorkflowId, onToast]);

  // Update workflow wrapper that marks dirty
  const handleWorkflowChange = useCallback((updater: (prev: Workflow) => Workflow) => {
    setActiveWorkflow((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      setIsDirty(true);
      return next;
    });
  }, []);

  // Selected Node lookup
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !activeWorkflow) return null;
    return activeWorkflow.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, activeWorkflow]);

  // Update specific node
  const handleUpdateNode = useCallback(
    (nodeId: string, patch: Partial<WorkflowNode>) => {
      handleWorkflowChange((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
      }));
    },
    [handleWorkflowChange]
  );

  // Delete node and connected edges
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      handleWorkflowChange((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== nodeId),
        edges: prev.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      }));
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      onToast("Node removed from canvas", "success");
    },
    [handleWorkflowChange, selectedNodeId, onToast]
  );

  // Delete edge connection
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      handleWorkflowChange((prev) => ({
        ...prev,
        edges: (prev.edges || []).filter((e) => e.id !== edgeId),
      }));
      onToast("Connection line removed", "success");
    },
    [handleWorkflowChange, onToast]
  );

  // Update workflow metadata (name, description, status, executionSettings)
  const handleUpdateWorkflowMeta = useCallback(
    (patch: Partial<Workflow>) => {
      handleWorkflowChange((prev) => ({
        ...prev,
        ...patch,
      }));
    },
    [handleWorkflowChange]
  );

  // Add node from palette click
  const handleAddNodeFromPalette = useCallback(
    (type: WorkflowNodeType) => {
      if (!activeWorkflow) return;
      const def = getNodeDefinition(type);
      const uniqueSuffix = Date.now().toString(36).slice(2, 6);
      const newNodeId = `node-${type.replace(/_/g, "-")}-${uniqueSuffix}`;
      const x = 200 + (activeWorkflow.nodes.length % 5) * 60;
      const y = 150 + (activeWorkflow.nodes.length % 4) * 50;

      const newNode: WorkflowNode = {
        id: newNodeId,
        type,
        name: def.defaultName,
        description: def.description,
        configuration: { ...def.defaultConfig },
        position: { x, y },
      };

      handleWorkflowChange((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newNode],
      }));
      handleSelectNode(newNodeId);
      onToast(`Added "${def.label}" node to canvas`, "success");
    },
    [activeWorkflow, handleWorkflowChange, handleSelectNode, onToast]
  );

  // Save workflow with graph validation check
  const handleSave = useCallback(async () => {
    if (!activeWorkflow) return;
    setIsSaving(true);
    try {
      // Validate workflow first to prevent persisting invalid graphs
      const report = await workflowsService.validate(activeWorkflow, activeWorkflow.id);
      if (!report.valid) {
        setValidationReport(report);
        onToast(
          `Cannot save invalid workflow (${report.errors.length} error(s)). Review issues in the report dialog.`,
          "error"
        );
        return;
      }

      const exists = workflows.some((w) => w.id === activeWorkflow.id);
      let saved: Workflow;
      if (exists) {
        saved = await workflowsService.update(activeWorkflow.id, activeWorkflow);
      } else {
        saved = await workflowsService.create(activeWorkflow);
      }
      setActiveWorkflow(saved);
      setIsDirty(false);
      setWorkflows((prev) => {
        const idx = prev.findIndex((w) => w.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });
      onToast(`Workflow "${saved.name}" saved successfully`, "success");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to save workflow", "error");
    } finally {
      setIsSaving(false);
    }
  }, [activeWorkflow, workflows, onToast]);

  // Validate workflow
  const handleValidate = useCallback(async () => {
    if (!activeWorkflow) return;
    setIsValidating(true);
    try {
      const report = await workflowsService.validate(activeWorkflow, activeWorkflow.id);
      setValidationReport(report);
      if (report.valid) {
        onToast("Workflow graph validation passed!", "success");
      } else {
        onToast(`Validation found ${report.errors.length} issue(s)`, "error");
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Validation failed", "error");
    } finally {
      setIsValidating(false);
    }
  }, [activeWorkflow, onToast]);

  // Export documented workflow package
  const handleExport = useCallback(() => {
    if (!activeWorkflow) return;
    try {
      const pkg = exportWorkflowPackage(activeWorkflow);
      const json = JSON.stringify(pkg, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeWorkflow.id || "workflow"}.pipeline.json`;
      a.click();
      URL.revokeObjectURL(url);
      onToast("Exported documented workflow package (.pipeline.json)", "success");
    } catch (e) {
      onToast("Failed to export workflow", "error");
    }
  }, [activeWorkflow, onToast]);

  // Import workflow package
  const handleImport = useCallback(
    async (content: string) => {
      try {
        const result = parseWorkflowPackage(content);
        if (!result.ok || !result.workflow) {
          throw new Error(result.error || "Failed to parse imported workflow specification");
        }

        const imported = result.workflow;
        setActiveWorkflow(imported);
        setIsDirty(true);
        setSelectedNodeId(null);

        // Immediate validation on import
        const report = await workflowsService.validate(imported, imported.id);
        setValidationReport(report);

        if (report.valid) {
          onToast(
            `Imported valid workflow "${imported.name}" (schema ${result.schemaVersion || "1.0.0"})`,
            "success"
          );
        } else {
          onToast(
            `Imported workflow has ${report.errors.length} validation issue(s). Review report.`,
            "error"
          );
        }
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Failed to import workflow", "error");
      }
    },
    [onToast]
  );

  // New Workflow - Start and End nodes are clean, without default connecting lines (or initialized from template)
  const handleNewWorkflow = useCallback((template?: Partial<Workflow>) => {
    const timestamp = Date.now().toString(36).slice(2, 6);
    const newWf: Workflow = {
      id: `wf-custom-${timestamp}`,
      name: template?.name || "New Pipeline",
      description: template?.description || "Custom multi-agent engineering workflow.",
      version: template?.version || "1.0.0",
      status: template?.status || "Draft",
      nodes: template?.nodes ? JSON.parse(JSON.stringify(template.nodes)) : [
        {
          id: "node-start",
          type: "start",
          name: "Start",
          description: "Pipeline trigger point.",
          configuration: {},
          position: { x: 80, y: 180 },
        },
        {
          id: "node-end",
          type: "end",
          name: "End",
          description: "Pipeline completion.",
          configuration: {},
          position: { x: 680, y: 180 },
        },
      ],
      edges: template?.edges ? JSON.parse(JSON.stringify(template.edges)) : [],
      executionSettings: template?.executionSettings ? { ...template.executionSettings } : {
        maxParallelNodes: 2,
        retryPolicy: { maxRetries: 2, backoffSeconds: 5 },
        requireApprovalFor: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveWorkflow(newWf);
    setIsDirty(true);
    setSelectedNodeId(null);
    setIsListView(false);
    onToast(
      template?.name
        ? `Created pipeline from template: "${template.name}"`
        : "Created new workflow canvas (Start and End ready to connect)",
      "success"
    );
  }, [onToast]);

  // Duplicate workflow
  const handleDuplicateWorkflow = useCallback(
    async (id: string) => {
      try {
        const copy = await workflowsService.duplicate(id);
        setWorkflows((prev) => [copy, ...prev]);
        setActiveWorkflow(copy);
        setIsListView(false);
        onToast(`Duplicated workflow as "${copy.name}"`, "success");
      } catch (e) {
        onToast("Failed to duplicate workflow", "error");
      }
    },
    [onToast]
  );

  // Delete workflow
  const handleDeleteWorkflow = useCallback(
    async (id: string) => {
      try {
        await workflowsService.remove(id);
        setWorkflows((prev) => prev.filter((w) => w.id !== id));
        if (activeWorkflow?.id === id) {
          const remaining = workflows.filter((w) => w.id !== id);
          if (remaining.length > 0) {
            setActiveWorkflow(remaining[0]);
          } else {
            setActiveWorkflow(null);
            setIsListView(true);
          }
        }
        onToast("Workflow deleted", "success");
      } catch (e) {
        onToast("Failed to delete workflow", "error");
      }
    },
    [workflows, activeWorkflow?.id, onToast]
  );

  // Switch workflow
  const handleSwitchWorkflow = useCallback(
    (id: string) => {
      const found = workflows.find((w) => w.id === id);
      if (found) {
        setActiveWorkflow(found);
        setIsDirty(false);
        setSelectedNodeId(null);
      }
    },
    [workflows]
  );

  const [currentExecution, setCurrentExecution] = useState<ExecutionRecord | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isRunMarkdownModalOpen, setIsRunMarkdownModalOpen] = useState(false);

  // Install pipeline: generates pipeline.md with all ordered steps and creates record
  const handleInstallPipeline = useCallback(
    async (targetWorkflowId?: string) => {
      const wf = targetWorkflowId
        ? workflows.find((w) => w.id === targetWorkflowId) || activeWorkflow
        : activeWorkflow;
      if (!wf) return;

      setIsInstalling(true);
      try {
        const [agents, skills] = await Promise.all([
          getAgentsStore().list().catch(() => []),
          getSkillsStore().list().catch(() => []),
        ]);

        const mdContent = generatePipelineMarkdown(wf, agents, skills);
        let installedPath = `.agents/pipelines/${wf.id}/pipeline.md`;

        if (hasVsCodeApi()) {
          try {
            const res = await sendRequest<any>("workflows.install", {
              id: wf.id,
              workflow: wf,
              markdown: mdContent,
            });
            if (res?.primaryPath) {
              installedPath = res.primaryPath;
            }
          } catch {
            // fallback
          }
        }

        try {
          localStorage.setItem(`agentforge.installed_pipeline_md_${wf.id}`, mdContent);
        } catch {
          // ignore
        }

        if (!hasVsCodeApi()) {
          const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${wf.id}.pipeline.md`;
          a.click();
          URL.revokeObjectURL(url);
        }

        onToast(`Pipeline "${wf.name}" installed! Created ${installedPath}`, "success");
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Failed to install pipeline", "error");
      } finally {
        setIsInstalling(false);
      }
    },
    [activeWorkflow, workflows, onToast]
  );

  // Run pipeline loaded from parsed markdown
  const handleRunParsedWorkflow = useCallback(
    async (parsedWf: Workflow) => {
      setActiveWorkflow(parsedWf);
      setIsListView(false);
      onToast(`Loaded pipeline "${parsedWf.name}". Starting execution in specified order…`, "success");

      setIsExecuting(true);
      try {
        const record = await executionsService.start(parsedWf);
        setCurrentExecution(record);

        if (record.status === "Waiting for Approval") {
          onToast("Execution paused: Human approval required to proceed.", "success");
        } else if (record.status === "Succeeded") {
          onToast("Pipeline executed successfully in exact specified order!", "success");
        } else if (record.status === "Failed") {
          onToast(`Execution failed: ${record.error || "Simulation error"}`, "error");
        }
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Execution failed", "error");
      } finally {
        setIsExecuting(false);
      }
    },
    [onToast]
  );

  // Preserve run data after the WebView reloads
  useEffect(() => {
    if (!activeWorkflow?.id) return;
    let isMounted = true;
    executionsService
      .list(activeWorkflow.id)
      .then((runs) => {
        if (isMounted && runs && runs.length > 0) {
          const latest = runs[0];
          setCurrentExecution((prev) => prev || latest);
        }
      })
      .catch(() => {
        // Fallback silently
      });
    return () => {
      isMounted = false;
    };
  }, [activeWorkflow?.id]);

  // Run pipeline execution check & start local simulation
  const handleRunWorkflow = useCallback(async () => {
    if (!activeWorkflow) return;
    setIsExecuting(true);
    try {
      // 1. Validate workflow first
      const report = await workflowsService.validate(activeWorkflow, activeWorkflow.id);
      if (!report.valid) {
        setValidationReport(report);
        onToast(
          `Execution blocked: Cannot execute workflow with ${report.errors.length} validation error(s). Review findings.`,
          "error"
        );
        return;
      }

      // 2. Start simulation run
      onToast("Starting deterministic local pipeline simulation…", "success");
      const record = await executionsService.start(activeWorkflow);
      setCurrentExecution(record);

      if (record.status === "Waiting for Approval") {
        onToast("Simulation paused: Human approval required to proceed.", "success");
      } else if (record.status === "Succeeded") {
        onToast("Simulation succeeded: All pipeline nodes completed cleanly.", "success");
      } else if (record.status === "Failed") {
        onToast(`Simulation failed: ${record.error || "Execution error"}`, "error");
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Simulation execution failed", "error");
    } finally {
      setIsExecuting(false);
    }
  }, [activeWorkflow, onToast]);

  const handleApproveNode = useCallback(
    async (nodeId?: string) => {
      if (!currentExecution) return;
      try {
        onToast("Submitting plan approval…", "success");
        const updated = await executionsService.resume(currentExecution.id, {
          action: "approve",
          approver: "Lead Architect",
          comment: "Approved plan and deliverables without conditions.",
        });
        setCurrentExecution(updated);
        if (updated.status === "Succeeded") {
          onToast("Approval confirmed. Remaining pipeline nodes executed successfully!", "success");
        }
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Approval failed", "error");
      }
    },
    [currentExecution, onToast]
  );

  const handleRejectNode = useCallback(
    async (nodeId?: string) => {
      if (!currentExecution) return;
      try {
        const updated = await executionsService.resume(currentExecution.id, {
          action: "reject",
          approver: "Lead Architect",
          comment: "Plan rejected by reviewer.",
        });
        setCurrentExecution(updated);
        onToast("Plan rejected. Pipeline halted.", "error");
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Rejection failed", "error");
      }
    },
    [currentExecution, onToast]
  );

  const handleCancelExecution = useCallback(async () => {
    if (!currentExecution) return;
    try {
      const updated = await executionsService.cancel(currentExecution.id);
      setCurrentExecution(updated);
      onToast("Simulation execution cancelled.", "success");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Cancellation failed", "error");
    }
  }, [currentExecution, onToast]);

  const handleRecoverExecution = useCallback(async () => {
    if (!currentExecution) return;
    try {
      onToast("Recovering interrupted simulation…", "success");
      const recovered = await executionsService.recover(currentExecution.id);
      setCurrentExecution(recovered);
      if (recovered.status === "Succeeded") {
        onToast("Simulation recovered and completed successfully!", "success");
      } else if (recovered.status === "Waiting for Approval") {
        onToast("Simulation recovered. Paused at human approval gate.", "success");
      } else {
        onToast(`Simulation recovered (status: ${recovered.status}).`, "success");
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Recovery failed", "error");
    }
  }, [currentExecution, onToast]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading Harness Pipeline Canvas…</div>
      </div>
    );
  }

  if (isListView || !activeWorkflow) {
    return (
      <div className="workflow-workspace" style={{ overflowY: "auto" }}>
        <WorkflowListPage
          workflows={workflows}
          activeWorkflowId={activeWorkflow?.id}
          onOpenWorkflow={(id) => {
            handleSwitchWorkflow(id);
            setIsListView(false);
          }}
          onNewWorkflow={handleNewWorkflow}
          onDuplicateWorkflow={handleDuplicateWorkflow}
          onDeleteWorkflow={handleDeleteWorkflow}
          onInstallWorkflow={handleInstallPipeline}
          onOpenRunMarkdown={() => setIsRunMarkdownModalOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="workflow-workspace">
      {/* Header Toolbar */}
      <WorkflowHeader
        workflow={activeWorkflow}
        savedWorkflows={workflows}
        isDirty={isDirty}
        isValidating={isValidating}
        isSaving={isSaving}
        onSave={handleSave}
        onValidate={handleValidate}
        onExport={handleExport}
        onImport={handleImport}
        onNewWorkflow={handleNewWorkflow}
        onSwitchWorkflow={handleSwitchWorkflow}
        onToggleListView={() => setIsListView(true)}
        onUpdateTitle={(name) => handleUpdateWorkflowMeta({ name })}
        onRunWorkflow={handleRunWorkflow}
        onInstall={() => handleInstallPipeline()}
        isInstalling={isInstalling}
        onRunFromMarkdown={() => setIsRunMarkdownModalOpen(true)}
        onNavigate={onNavigate}
      />

      {/* Main Workspace Body */}
      <div
        className={`workflow-body ${isPaletteCollapsed ? "palette-collapsed" : ""} ${
          isSettingsCollapsed ? "sidebar-collapsed" : ""
        }`}
      >
        {/* Left Palette */}
        <NodePalette
          onAddNode={handleAddNodeFromPalette}
          isCollapsed={isPaletteCollapsed}
          onToggleCollapse={() => setIsPaletteCollapsed((c) => !c)}
        />

        {/* Visual Canvas */}
        <ReactFlowProvider>
          <FlowCanvas
            workflow={activeWorkflow}
            onWorkflowChange={handleWorkflowChange}
            selectedNodeId={selectedNodeId}
            onSelectNodeId={handleSelectNode}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            executionRecord={currentExecution}
            onApproveNode={handleApproveNode}
            onRejectNode={handleRejectNode}
            isPaletteCollapsed={isPaletteCollapsed}
            onTogglePalette={() => setIsPaletteCollapsed((c) => !c)}
            isSettingsCollapsed={isSettingsCollapsed}
            onToggleSettings={() => setIsSettingsCollapsed((c) => !c)}
          />
        </ReactFlowProvider>

        {/* Right Properties Sidebar */}
        <PropertiesSidebar
          selectedNode={selectedNode}
          workflow={activeWorkflow}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onUpdateWorkflowMeta={handleUpdateWorkflowMeta}
          isCollapsed={isSettingsCollapsed}
          onToggleCollapse={() => setIsSettingsCollapsed((c) => !c)}
        />

        {/* Execution Drawer */}
        <ExecutionDrawer
          execution={currentExecution}
          onClose={() => setCurrentExecution(null)}
          onApprove={handleApproveNode}
          onReject={handleRejectNode}
          onCancel={handleCancelExecution}
          onRecover={handleRecoverExecution}
          onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
        />
      </div>

      {/* Validation Dialog */}
      <ValidationModal
        report={validationReport}
        onClose={() => setValidationReport(null)}
        onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
      />

      {/* Run Pipeline from Markdown Dialog */}
      <RunPipelineMarkdownModal
        isOpen={isRunMarkdownModalOpen}
        activeWorkflow={activeWorkflow}
        savedWorkflows={workflows}
        onRunParsedWorkflow={handleRunParsedWorkflow}
        onClose={() => setIsRunMarkdownModalOpen(false)}
      />
    </div>
  );
};
