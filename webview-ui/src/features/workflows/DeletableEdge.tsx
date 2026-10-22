import React, { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";

export interface DeletableEdgeData {
  onDeleteEdge?: (id: string) => void;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export const DeletableEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  selected,
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [isHovered, setIsHovered] = useState(false);
  const edgeData = data as DeletableEdgeData | undefined;
  const onDeleteEdge = edgeData?.onDeleteEdge;

  return (
    <>
      {/* Invisible wider stroke path for easy hovering and clicking */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={24}
        className="react-flow__edge-interaction"
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 2.5 : style.strokeWidth || 1.5,
          transition: "stroke 0.15s ease, stroke-width 0.15s ease",
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            display: "flex",
            alignItems: "center",
            gap: 4,
            zIndex: 1000,
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {label && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                background: "var(--surface, #FFFFFF)",
                border: "1px solid var(--border, #E2E8F0)",
                borderRadius: 4,
                padding: "1px 6px",
                color: "var(--text-secondary, #64748B)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                userSelect: "none",
              }}
            >
              {label}
            </div>
          )}

          {(isHovered || selected) && onDeleteEdge && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteEdge(id);
              }}
              title="Delete this connection line (Backspace/Delete also works)"
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#EF4444",
                color: "#FFFFFF",
                border: "1.5px solid #DC2626",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                boxShadow: "0 2px 5px rgba(239, 68, 68, 0.4)",
                transition: "transform 0.12s ease, background 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.15)";
                e.currentTarget.style.background = "#DC2626";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.background = "#EF4444";
              }}
              aria-label="Delete edge connection"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
