import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  text?: string;
  icon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  variant?: "standard" | "glass";
  action?: ReactNode;
}

export function EmptyState({
  title,
  text,
  icon: Icon = Inbox,
  variant = "standard",
  action,
}: EmptyStateProps) {
  if (variant === "glass") {
    return (
      <div className="empty-state-glass-card">
        <div className="empty-state-icon-wrapper">
          <div className="empty-state-icon-glow" />
          <div className="empty-state-icon-badge">
            <Icon size={32} />
          </div>
        </div>
        <h3 className="empty-state-glass-title">{title}</h3>
        {text && <p className="empty-state-glass-text">{text}</p>}
        {action && <div className="empty-state-glass-action">{action}</div>}
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="empty-state-icon-wrapper" style={{ width: 56, height: 56, marginBottom: 12 }}>
        <div className="empty-state-icon-glow" style={{ opacity: 0.4 }} />
        <div className="empty-state-icon-badge" style={{ width: 48, height: 48, borderRadius: 12 }}>
          <Icon size={24} />
        </div>
      </div>
      <div className="empty-state-title">{title}</div>
      {text && <div className="empty-state-text">{text}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
