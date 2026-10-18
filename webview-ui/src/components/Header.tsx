import { PanelLeftClose, PanelLeftOpen, RefreshCw } from "lucide-react";

interface HeaderProps {
  title: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRefresh?: () => void;
}

export function Header({ title, collapsed, onToggleCollapse, onRefresh }: HeaderProps) {
  return (
    <header className="header" role="banner">
      <div className="header-left">
        <button
          className="collapse-btn"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <span className="header-title" title={title}>{title}</span>
      </div>
      <div className="header-right">
        {onRefresh && (
          <button
            className="collapse-btn"
            aria-label="Refresh"
            onClick={onRefresh}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
