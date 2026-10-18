import { useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { PlaceholderPage } from "../features/PlaceholderPage";
import { findNavItem, ALL_NAV_ITEMS } from "../navigation/registry";

interface AppLayoutProps {
  route: string;
  onNavigate: (route: string) => void;
  dashboardData: import("../types").DashboardData | null;
}

export function AppLayout({ route, onNavigate, dashboardData }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const item = findNavItem(route) ?? ALL_NAV_ITEMS[0];
  const title = item.label;

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
          {item.id === "dashboard" ? (
            <DashboardPage data={dashboardData} onNavigate={onNavigate} />
          ) : item.id === "settings" ? (
            <SettingsPage />
          ) : (
            <PlaceholderPage item={item} />
          )}
        </main>
      </div>
    </div>
  );
}
