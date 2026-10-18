import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "error";
  onClick?: () => void;
}

export function MetricCard({ label, value, icon: Icon, tone = "default", onClick }: MetricCardProps) {
  const toneColor =
    tone === "success"
      ? "var(--success)"
      : tone === "warning"
      ? "var(--warning)"
      : tone === "error"
      ? "var(--error)"
      : "var(--accent)";

  return (
    <button type="button" className="metric-card" onClick={onClick} aria-label={`${label}: ${value}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: toneColor }}>{value}</div>
      {Icon && (
        <div style={{ marginTop: 8, color: "var(--text-secondary)" }}>
          <Icon size={14} />
        </div>
      )}
    </button>
  );
}
