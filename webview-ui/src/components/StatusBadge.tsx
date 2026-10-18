type BadgeTone = "success" | "warning" | "error" | "info" | "neutral";

interface StatusBadgeProps {
  status: string;
}

function toneFor(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === "ready" || s === "succeeded" || s === "active" || s === "connected") return "success";
  if (s === "running" || s === "pending") return "info";
  if (s === "draft" || s === "experimental" || s === "mock") return "warning";
  if (s === "failed" || s === "deprecated" || s === "cancelled" || s === "not connected") return "error";
  return "neutral";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = toneFor(status);
  return <span className={`badge ${tone}`}>{status}</span>;
}

export { toneFor };
