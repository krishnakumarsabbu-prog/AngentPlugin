import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { PlaceholderPage } from "../features/PlaceholderPage";
import { SkillsStudioPage } from "../features/skills/SkillsStudioPage";
import { SkillDetailsPage } from "../features/skills/SkillDetailsPage";
import { SkillFormPage } from "../features/skills/SkillFormPage";
import { AgentStudioPage } from "../features/agents/AgentStudioPage";
import { AgentDetailsPage } from "../features/agents/AgentDetailsPage";
import { AgentFormPage } from "../features/agents/AgentFormPage";
import { HarnessPipelinePage } from "../features/workflows/HarnessPipelinePage";
import { ExecutionHistoryPage } from "../features/executions/ExecutionHistoryPage";
import { PipelineComparisonPage } from "../features/comparison/PipelineComparisonPage";
import { TestEvaluationStudioPage } from "../features/evaluation/TestEvaluationStudioPage";
import { GovernanceAuditPage } from "../features/governance/GovernanceAuditPage";
import { PackageManagerPage } from "../features/packages/PackageManagerPage";
import { PlatformIntegrationsPage } from "../features/integrations/PlatformIntegrationsPage";
import { PersonaSkillStudioPage } from "../features/persona/PersonaSkillStudioPage";
import { ToastRegion, type ToastItem, type ToastTone } from "../components/ui/Toast";
import { findNavItem, ALL_NAV_ITEMS } from "../navigation/registry";
import { useTheme } from "../services/ThemeContext";

interface AppLayoutProps {
  route: string;
  onNavigate: (route: string) => void;
  dashboardData: import("../types").DashboardData | null;
}

export function AppLayout({ route, onNavigate, dashboardData }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [skillsRefresh, setSkillsRefresh] = useState(0);
  const [agentsRefresh, setAgentsRefresh] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [formDirty, setFormDirty] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const pushToast = useCallback((message: string, tone: ToastTone = "success", duration = 10000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, tone, duration }]);
  }, []);

  const handleSkillsChanged = useCallback(() => {
    setSkillsRefresh((n) => n + 1);
  }, []);

  const handleAgentsChanged = useCallback(() => {
    setAgentsRefresh((n) => n + 1);
  }, []);

  const [pipelineNavSignal, setPipelineNavSignal] = useState(0);

  useEffect(() => {
    if (
      route.startsWith("skill-new") ||
      route.startsWith("skill-edit:") ||
      route.startsWith("agent-new") ||
      route.startsWith("agent-edit:")
    ) {
      setFormDirty(false);
    }
  }, [route]);

  const guardedNavigate = useCallback(
    (next: string) => {
      if (next === "harness-pipeline") {
        setPipelineNavSignal((s) => s + 1);
      }
      const onForm =
        (route.startsWith("skill-new") ||
          route.startsWith("skill-edit:") ||
          route.startsWith("agent-new") ||
          route.startsWith("agent-edit:")) &&
        !next.startsWith("skill-new") &&
        !next.startsWith("skill-edit:") &&
        !next.startsWith("agent-new") &&
        !next.startsWith("agent-edit:");

      if (onForm && formDirty) {
        setPendingRoute(next);
        return;
      }
      onNavigate(next);
    },
    [route, formDirty, onNavigate],
  );

  const parseSkillRoute = (): { kind: "new" | "edit" | "details"; skillId?: string } | null => {
    if (route === "skill-new") return { kind: "new" };
    if (route.startsWith("skill-edit:")) return { kind: "edit", skillId: route.slice("skill-edit:".length) };
    if (route.startsWith("skill-details:")) return { kind: "details", skillId: route.slice("skill-details:".length) };
    return null;
  };

  const parseAgentRoute = (): { kind: "new" | "edit" | "details"; agentId?: string } | null => {
    if (route === "agent-new") return { kind: "new" };
    if (route.startsWith("agent-edit:")) return { kind: "edit", agentId: route.slice("agent-edit:".length) };
    if (route.startsWith("agent-details:")) return { kind: "details", agentId: route.slice("agent-details:".length) };
    return null;
  };

  const skillRoute = parseSkillRoute();
  const agentRoute = parseAgentRoute();

  const activeNavId = skillRoute
    ? "skills-studio"
    : agentRoute
      ? "agent-studio"
      : route.startsWith("pipeline-comparison")
        ? "pipeline-comparison"
        : route.startsWith("execution-history")
          ? "execution-history"
          : route.startsWith("test-evaluation")
            ? "test-evaluation"
            : route.startsWith("governance-audit")
              ? "governance-audit"
              : route.startsWith("package-manager")
                ? "package-manager"
                : route.startsWith("platform-integrations")
                  ? "platform-integrations"
                  : route;

  const item = findNavItem(activeNavId) ?? ALL_NAV_ITEMS[0];

  const title = skillRoute
    ? skillRoute.kind === "new"
      ? "Create Skill"
      : skillRoute.kind === "edit"
        ? "Edit Skill"
        : "Skill Details"
    : agentRoute
      ? agentRoute.kind === "new"
        ? "Create Agent"
        : agentRoute.kind === "edit"
          ? "Edit Agent"
          : "Agent Details"
      : item.label;

  const { themeClass } = useTheme();

  return (
    <div className={`app ${themeClass}`}>
      <Sidebar activeId={item.id} collapsed={collapsed} onNavigate={guardedNavigate} />
      <div className="main">
        <Header
          title={title}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
        <main className={`content ${item.id === "harness-pipeline" ? "content-canvas" : ""}`}>
          {skillRoute?.kind === "new" ? (
            <SkillFormPage
              skillId={null}
              onNavigate={guardedNavigate}
              onSkillsChanged={handleSkillsChanged}
              onToast={pushToast}
              onDirtyChange={setFormDirty}
            />
          ) : skillRoute?.kind === "edit" ? (
            <SkillFormPage
              skillId={skillRoute.skillId ?? null}
              onNavigate={guardedNavigate}
              onSkillsChanged={handleSkillsChanged}
              onToast={pushToast}
              onDirtyChange={setFormDirty}
            />
          ) : skillRoute?.kind === "details" ? (
            <SkillDetailsPage
              skillId={skillRoute.skillId ?? ""}
              onNavigate={guardedNavigate}
              onSkillsChanged={handleSkillsChanged}
              onToast={pushToast}
            />
          ) : agentRoute?.kind === "new" ? (
            <AgentFormPage
              agentId={null}
              onNavigate={guardedNavigate}
              onAgentsChanged={handleAgentsChanged}
              onToast={pushToast}
              onDirtyChange={setFormDirty}
            />
          ) : agentRoute?.kind === "edit" ? (
            <AgentFormPage
              agentId={agentRoute.agentId ?? null}
              onNavigate={guardedNavigate}
              onAgentsChanged={handleAgentsChanged}
              onToast={pushToast}
              onDirtyChange={setFormDirty}
            />
          ) : agentRoute?.kind === "details" ? (
            <AgentDetailsPage
              agentId={agentRoute.agentId ?? ""}
              onNavigate={guardedNavigate}
              onAgentsChanged={handleAgentsChanged}
              onToast={pushToast}
            />
          ) : item.id === "persona-studio" ? (
            <PersonaSkillStudioPage
              onNavigate={guardedNavigate}
              onToast={pushToast}
            />
          ) : item.id === "skills-studio" ? (
            <SkillsStudioPage
              onNavigate={guardedNavigate}
              onOpenSkill={(id) => guardedNavigate(`skill-details:${id}`)}
              refreshSignal={skillsRefresh}
              onSkillsChanged={handleSkillsChanged}
              onToast={pushToast}
            />
          ) : item.id === "agent-studio" ? (
            <AgentStudioPage
              onNavigate={guardedNavigate}
              onOpenAgent={(id) => guardedNavigate(`agent-details:${id}`)}
              refreshSignal={agentsRefresh}
              onAgentsChanged={handleAgentsChanged}
              onToast={pushToast}
            />
          ) : item.id === "harness-pipeline" ? (
            <HarnessPipelinePage
              onToast={pushToast}
              onNavigate={guardedNavigate}
              route={route}
              navSignal={pipelineNavSignal}
            />
          ) : item.id === "execution-history" ? (
            <ExecutionHistoryPage onNavigate={guardedNavigate} onToast={pushToast} />
          ) : item.id === "pipeline-comparison" ? (
            <PipelineComparisonPage onNavigate={guardedNavigate} onToast={pushToast} route={route} />
          ) : item.id === "test-evaluation" ? (
            <TestEvaluationStudioPage onNavigate={guardedNavigate} onToast={pushToast} />
          ) : item.id === "governance-audit" ? (
            <GovernanceAuditPage onNavigate={guardedNavigate} onToast={pushToast} />
          ) : item.id === "package-manager" ? (
            <PackageManagerPage onNavigate={guardedNavigate} onToast={pushToast} />
          ) : item.id === "platform-integrations" ? (
            <PlatformIntegrationsPage onNavigate={guardedNavigate} onToast={pushToast} />
          ) : item.id === "dashboard" ? (
            <DashboardPage data={dashboardData} onNavigate={guardedNavigate} />
          ) : item.id === "settings" ? (
            <SettingsPage />
          ) : (
            <PlaceholderPage item={item} />
          )}
        </main>
      </div>
      <ToastRegion
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        duration={10000}
      />

      {pendingRoute && (
        <div
          className="dialog-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingRoute(null);
          }}
        >
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Unsaved changes">
            <div className="dialog-header">
              <h2 className="dialog-title">Discard unsaved changes?</h2>
            </div>
            <div className="dialog-body">
              You have unsaved edits on this form. Leaving now will discard them.
            </div>
            <div className="dialog-footer">
              <button className="btn secondary" onClick={() => setPendingRoute(null)}>
                Keep editing
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  const target = pendingRoute;
                  setPendingRoute(null);
                  setFormDirty(false);
                  if (target) onNavigate(target);
                }}
              >
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
