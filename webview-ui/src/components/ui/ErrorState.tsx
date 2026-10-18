import type { LucideIcon } from "lucide-react";
import { TriangleAlert as AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title: string;
  text?: string;
  onRetry?: () => void;
  icon?: LucideIcon;
}

export function ErrorState({ title, text, onRetry, icon: Icon = AlertTriangle }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <Icon size={26} />
      <div className="error-state-title">{title}</div>
      {text && <div className="error-state-text">{text}</div>}
      {onRetry && (
        <div className="error-state-actions">
          <Button variant="primary" onClick={onRetry}>Retry</Button>
        </div>
      )}
    </div>
  );
}
