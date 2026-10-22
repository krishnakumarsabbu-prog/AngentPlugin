import { PanelLeftClose, PanelLeftOpen, RefreshCw } from "lucide-react";
import { Breadcrumbs, type Crumb } from "./ui/Breadcrumbs";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface HeaderProps {
  title: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRefresh?: () => void;
}

export function Header({ title, collapsed, onToggleCollapse, onRefresh }: HeaderProps) {
  const crumbs: Crumb[] = [{ label: "AgentForge" }, { label: title }];

  return (
    <header className="header" role="banner">
      <div className="header-left" style={{ gap: 12 }}>
        <button
          className="collapse-btn"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <Breadcrumbs items={crumbs} />
      </div>
      <div className="header-right" style={{ gap: 10 }}>
        <ThemeSwitcher />
        {onRefresh && (
          <button
            className="collapse-btn"
            aria-label="Refresh"
            onClick={onRefresh}
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        )}
      </div>
    </header>
  );
}
