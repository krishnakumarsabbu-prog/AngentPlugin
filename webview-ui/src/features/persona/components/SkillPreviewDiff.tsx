import React, { useState } from "react";
import { FileText, Edit3, Eye, Copy, Check, RotateCcw } from "lucide-react";
import type { GeneratedFile, SkillIntermediateRepresentation } from "../../../types/persona";

interface SkillPreviewDiffProps {
  ir: SkillIntermediateRepresentation;
  files: GeneratedFile[];
  onFileChange: (path: string, newContent: string) => void;
  onResetFile: (path: string) => void;
}

export function SkillPreviewDiff({
  ir,
  files,
  onFileChange,
  onResetFile,
}: SkillPreviewDiffProps) {
  const [activeFilePath, setActiveFilePath] = useState<string>(files[0]?.path || "SKILL.md");
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const activeFile = files.find((f) => f.path === activeFilePath) || files[0];

  const handleCopy = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="skill-preview-diff card" style={{ padding: 16, borderRadius: 8, border: "1px solid var(--border)" }}>
      {/* File Tabs & Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          paddingBottom: 10,
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {files.map((file) => {
            const isActive = file.path === activeFilePath;
            return (
              <button
                key={file.path}
                type="button"
                className={`btn ${isActive ? "primary" : "secondary"}`}
                style={{ fontSize: 11, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => setActiveFilePath(file.path)}
              >
                <FileText size={12} />
                {file.path}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className={`btn ${editMode ? "primary" : "secondary"}`}
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => setEditMode((m) => !m)}
          >
            {editMode ? <Eye size={12} style={{ marginRight: 4 }} /> : <Edit3 size={12} style={{ marginRight: 4 }} />}
            {editMode ? "Preview Mode" : "Direct Edit"}
          </button>

          <button
            type="button"
            className="btn secondary"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={handleCopy}
          >
            {copied ? <Check size={12} color="#10B981" style={{ marginRight: 4 }} /> : <Copy size={12} style={{ marginRight: 4 }} />}
            {copied ? "Copied" : "Copy Content"}
          </button>
        </div>
      </div>

      {/* File Purpose & Path */}
      {activeFile && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>Purpose: <strong>{activeFile.purpose}</strong></span>
          <span>Lines: {activeFile.content.split("\n").length}</span>
        </div>
      )}

      {/* Editor / Content Area */}
      {activeFile && (
        <div>
          {editMode ? (
            <textarea
              value={activeFile.content}
              onChange={(e) => onFileChange(activeFile.path, e.target.value)}
              style={{
                width: "100%",
                minHeight: 450,
                fontFamily: "monospace",
                fontSize: 12,
                lineHeight: 1.5,
                padding: 12,
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--bg-editor, #F9FAFB)",
                color: "var(--text-primary)",
                resize: "vertical",
              }}
            />
          ) : (
            <pre
              style={{
                margin: 0,
                padding: 14,
                borderRadius: 6,
                background: "var(--bg-subtle, #F9FAFB)",
                border: "1px solid var(--border)",
                fontSize: 11.5,
                lineHeight: 1.5,
                fontFamily: "Consolas, Menlo, Monaco, monospace",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                maxHeight: 500,
              }}
            >
              {activeFile.content}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
