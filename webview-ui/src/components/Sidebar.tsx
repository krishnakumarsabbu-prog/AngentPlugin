import { NAV_GROUPS } from "../navigation/registry";

interface SidebarProps {
  activeId: string;
  collapsed: boolean;
  onNavigate: (id: string) => void;
}

export function Sidebar({ activeId, collapsed, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`} aria-label="Navigation">
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden>AF</span>
        <span className="brand-text">AgentForge</span>
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item${isActive ? " active" : ""}`}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="nav-icon"><Icon size={16} /></span>
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
