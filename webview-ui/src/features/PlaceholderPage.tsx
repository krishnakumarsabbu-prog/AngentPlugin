import type { NavItem } from "../navigation/registry";
import { CalendarClock } from "lucide-react";

interface PlaceholderPageProps {
  item: NavItem;
}

export function PlaceholderPage({ item }: PlaceholderPageProps) {
  return (
    <div className="placeholder">
      <span className="placeholder-pill">
        <CalendarClock size={12} /> Planned for a later phase
      </span>
      <h2>{item.label}</h2>
      <p>{item.description}</p>
      {item.future.length > 0 && (
        <ul>
          {item.future.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: 8 }}>
        This module is part of the AgentForge roadmap. Navigation and routing are wired now so future
        implementation prompts can fill it in without restructuring the app.
      </p>
    </div>
  );
}
