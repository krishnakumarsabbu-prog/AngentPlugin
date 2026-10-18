import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  text?: string;
  icon?: LucideIcon;
}

export function EmptyState({ title, text, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon size={28} /></div>
      <div className="empty-state-title">{title}</div>
      {text && <div className="empty-state-text">{text}</div>}
    </div>
  );
}
