import { useCallback, useState } from "react";
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

  const item = findNavItem(route) ?? ALL_NAV_ITEMS[0];
  const title = item.label;

  const pushToast = useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
  }, []);

  const handleSkillsChanged = useCallback(() => {
    setSkillsRefresh((n) => n + 1);
  }, []);

  const parseSkillRoute = (): { kind: "new" | "edit" | "details"; skillId?: string } | null => {
    if (route === "skill-new") return { kind: "new" };
    if (route.startsWith("skill-edit:")) return { kind: "edit", skillId: route.slice("skill-edit:".length) };
    if (route.startsWith("skill-details:")) return { kind: "details", skillId: route.slice("skill-details:".length) };
    return null;
  };

  const skillRoute = parseSkillRoute();

  return (
    <div className="app">
      <Sidebar activeId={item.id} collapsed={collapsed} onNavigate={onNavigate} />
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
              onNavigate={onNavigate}
              onSkillsChanged={handleSkillsChanged}
              onToast={pushToast}
            />
          ) : skillRoute?.kind === "edit" ? (
            <SkillFormPage
              skillId={skillRoute.skillId ?? null}
              onNavigate={onNavigate}
              onSkillsChanged={handleSkillsChanged}
              onToast={pushToast}
            />
          ) : skillRoute?.kind === "details" ? (
            <SkillDetailsPage
              skillId={skillRoute.skillId ?? ""}
              onNavigate={onNavigate}
              onSkillsChanged={handleSkillsChanged}
              onToast={pushToast}
            />
          ) : item.id === "skills-studio" ? (
            <SkillsStudioPage
              onNavigate={onNavigate}
              onOpenSkill={(id) => onNavigate(`skill-details:${id}`)}
              refreshSignal={skillsRefresh}
              onSkillsChanged={handleSkillsChanged}
              onToast={pushToast}
            />
          ) : item.id === "dashboard" ? (
            <DashboardPage data={dashboardData} onNavigate={onNavigate} />
          ) : item.id === "settings" ? (
            <SettingsPage />
          ) : (
            <PlaceholderPage item={item} />
          )}
        </main>
      </div>
      <ToastRegion toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
