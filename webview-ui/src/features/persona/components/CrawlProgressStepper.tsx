import React from "react";
import { Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import type { CrawlProgressEvent } from "../../../types/persona";

interface CrawlProgressStepperProps {
  progress?: CrawlProgressEvent | null;
  isCrawling: boolean;
  onCancel: () => void;
}

const STAGES = [
  "Discovering repository",
  "Mapping project structure",
  "Analyzing architecture",
  "Extracting coding conventions",
  "Identifying execution behavior",
  "Auditing quality & risk signals",
  "Applying persona priorities",
  "Compiling skill IR",
  "Preparing skill preview",
];

export function CrawlProgressStepper({
  progress,
  isCrawling,
  onCancel,
}: CrawlProgressStepperProps) {
  const currentStage = progress?.stageNumber ?? 1;
  const percent = Math.min(100, Math.round(((currentStage - 1) / STAGES.length) * 100));

  return (
    <div
      className="card"
      style={{
        padding: 20,
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
            {isCrawling ? <Loader2 size={18} className="spin" color="var(--accent)" /> : <CheckCircle2 size={18} color="#10B981" />}
            Deep Repository Analysis Pipeline
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            {progress?.message || "Running deep static analysis across repository files…"}
          </p>
        </div>

        {isCrawling && (
          <button type="button" className="btn secondary danger-text" onClick={onCancel} style={{ fontSize: 12 }}>
            <XCircle size={14} style={{ marginRight: 6 }} /> Cancel Crawl
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: 8,
          background: "var(--bg-subtle, #E5E7EB)",
          borderRadius: 4,
          overflow: "hidden",
          margin: "12px 0 16px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "linear-gradient(90deg, #6366F1, #3B82F6)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Stage Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 8,
          marginTop: 12,
        }}
      >
        {STAGES.map((label, idx) => {
          const stepNum = idx + 1;
          const isDone = currentStage > stepNum;
          const isActive = currentStage === stepNum && isCrawling;

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 6,
                background: isActive ? "rgba(99, 102, 241, 0.08)" : isDone ? "rgba(16, 185, 129, 0.05)" : "transparent",
                border: isActive ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
                fontSize: 11,
              }}
            >
              {isDone ? (
                <CheckCircle2 size={13} color="#10B981" />
              ) : isActive ? (
                <Loader2 size={13} className="spin" color="var(--accent)" />
              ) : (
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    border: "1px solid var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8,
                  }}
                >
                  {stepNum}
                </div>
              )}
              <span
                style={{
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--text-primary)" : isDone ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Real-time Metrics bar */}
      {progress && (
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid var(--border)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          <div>
            Files processed: <strong>{progress.filesProcessed}</strong> / {progress.totalFilesDiscovered}
          </div>
          <div>
            Evidence findings: <strong style={{ color: "var(--accent)" }}>{progress.findingsCount}</strong>
          </div>
          {progress.currentFile && (
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
              Current: <code>{progress.currentFile}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
