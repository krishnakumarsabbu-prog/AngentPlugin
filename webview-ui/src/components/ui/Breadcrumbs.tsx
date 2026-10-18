import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span className="breadcrumb-sep"><ChevronRight size={11} /></span>}
          {c.onClick && i < items.length - 1 ? (
            <button
              type="button"
              className="breadcrumb-item"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--accent)" }}
              onClick={c.onClick}
            >
              {c.label}
            </button>
          ) : (
            <span className={`breadcrumb-item${i === items.length - 1 ? " current" : ""}`}>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
