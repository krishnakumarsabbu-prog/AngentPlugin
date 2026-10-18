import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { PlaceholderPage } from "../features/PlaceholderPage";
import { SkillsStudioPage } from "../features/skills/SkillsStudioPage";
import { SkillDetailsPage } from "../features/skills/SkillDetailsPage";
import { SkillFormPage } from "../features/skills/SkillFormPage";
import { ToastRegion, type ToastItem } from "../components/ui/Toast";
import { findNavItem, ALL_NAV_ITEMS } from "../navigation/registry";

interface AppLayoutProps {
  route: string;
  onNavigate: (route: string) => void;
  dashboardData: import("../types").DashboardData | null;
}

export function AppLayout({ route, onNavigate, dashboardData }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [skillsRefresh, setSkillsRefresh] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [formDirty, setFormDirty] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const pushToast = useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
  }, []);

  const handleSkillsChanged = useCallback(() => {
    setSkillsRefresh((n) => n + 1);
  }, []);

  useEffect(() => {
    if (route.startsWith("skill-new") || route.startsWith("skill-edit:")) {
      setFormDirty(false);
    }
  }, [route]);

  const guardedNavigate = useCallback(
    (next: string) => {
      const onForm =
        (route.startsWith("skill-new") || route.startsWith("skill-edit:")) &&
        !next.startsWith("skill-new") &&
        !next.startsWith("skill-edit:");
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

  const skillRoute = parseSkillRoute();
  const item = findNavItem(route) ?? ALL_NAV_ITEMS[0];
  const title = skillRoute && skillRoute.kind !== "details" ? (skillRoute.kind === "new" ? "Create Skill" : "Edit Skill") : item.label;

  return (
    <div className="app">
      <Sidebar activeId={item.id} collapsed={collapsed} onNavigate={guardedNavigate} />
      <div className="main">
        <Header
          title={title}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
        <main className="content">
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
          ) : item.id === "skills-studio" ? (
            <SkillsStudioPage
              onNavigate={guardedNavigate}
              onOpenSkill={(id) => guardedNavigate(`skill-details:${id}`)}
              refreshSignal={skillsRefresh}
              onSkillsChanged={handleSkillsChanged}
              onToast={pushToast}
            />
          ) : item.id === "dashboard" ? (
            <DashboardPage data={dashboardData} onNavigate={guardedNavigate} />
          ) : item.id === "settings" ? (
            <SettingsPage />
          ) : (
            <PlaceholderPage item={item} />
          )}
        </main>
      </div>
      <ToastRegion toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

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
              You have unsaved edits on this skill. Leaving now will discard them.
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
