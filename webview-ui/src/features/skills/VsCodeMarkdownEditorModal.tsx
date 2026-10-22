import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  FileCode,
  Eye,
  Code2,
  Columns,
  Copy,
  Check,
  Save,
  Download,
  X,
  Info,
  Lightbulb,
  Flame,
  AlertTriangle,
  AlertOctagon,
  CheckSquare,
  Square,
} from "lucide-react";
import { getSkillResourceContent, saveSkillResourceContent } from "../../services/skillsService";
import { useTheme } from "../../services/ThemeContext";
import { ThemeSwitcher } from "../../components/ThemeSwitcher";

interface VsCodeMarkdownEditorModalProps {
  open: boolean;
  skillId: string;
  resourceName: string;
  resourceDescription?: string;
  onClose: () => void;
  onToast: (msg: string, tone?: "success" | "error") => void;
}

type ViewMode = "preview" | "split" | "source";

export const VsCodeMarkdownEditorModal: React.FC<VsCodeMarkdownEditorModalProps> = ({
  open,
  skillId,
  resourceName,
  resourceDescription,
  onClose,
  onToast,
}) => {
  const { themeClass, config } = useTheme();
  const [content, setContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [copied, setCopied] = useState(false);
  const [filePath, setFilePath] = useState<string>("");
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load content whenever modal opens
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);

    getSkillResourceContent(skillId, resourceName)
      .then((res) => {
        if (!active) return;
        setContent(res.content);
        setOriginalContent(res.content);
        setFilePath(res.path || `skills/${skillId}/${resourceName}`);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Failed to load resource";
        setContent(`# ${resourceName}\n\n${resourceDescription || ""}\n\n*(Error loading file content: ${msg})*`);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, skillId, resourceName, resourceDescription]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const isDirty = content !== originalContent;
  const isMarkdown = resourceName.toLowerCase().endsWith(".md");

  // Track cursor position
  const handleTextareaSelect = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const textBefore = content.slice(0, pos);
    const lines = textBefore.split("\n");
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    setCursorPos({ line, col });
  };

  // Support tab indentation in textarea
  const handleKeyDownInEditor = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const newVal = val.substring(0, start) + "  " + val.substring(end);
      setContent(newVal);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onToast("Copied content to clipboard", "success");
    });
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = resourceName;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Downloaded ${resourceName}`, "success");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSkillResourceContent(skillId, resourceName, content);
      setOriginalContent(content);
      onToast(`Saved ${resourceName}`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      onToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const lines = useMemo(() => content.split("\n"), [content]);
  const lineCount = lines.length;

  if (!open) return null;

  return createPortal(
    <div
      className={themeClass}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 999999,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "94vw",
          maxWidth: "1350px",
          height: "90vh",
          background: "var(--surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(0,0,0,0.18), var(--shadow-card)",
          overflow: "hidden",
          fontFamily: "var(--font-sans)",
        }}
      >
        {/* VS Code Tab Bar Header - Themed */}
        <div
          style={{
            height: "46px",
            background: "var(--surface-alt)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            userSelect: "none",
            gap: "8px",
          }}
        >
          {/* Active Tab */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <div
              style={{
                height: "46px",
                padding: "0 14px",
                background: "var(--surface)",
                borderTop: "3px solid var(--accent)",
                borderRight: "1px solid var(--border)",
                borderLeft: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {isMarkdown ? (
                <FileText size={15} style={{ color: "var(--accent)" }} />
              ) : (
                <FileCode size={15} style={{ color: "var(--warning)" }} />
              )}
              <span style={{ whiteSpace: "nowrap" }}>{resourceName}</span>
              {isDirty && (
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    marginLeft: "4px",
                  }}
                  title="Unsaved changes"
                />
              )}
            </div>

            <span
              style={{
                fontSize: "11px",
                color: "var(--accent)",
                background: "var(--accent-subtle)",
                border: "1px solid var(--border)",
                padding: "2px 8px",
                borderRadius: "4px",
                marginLeft: "4px",
                fontFamily: "var(--font-mono)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "350px",
              }}
            >
              {filePath}
            </span>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {/* Embedded Theme Switcher for testing all 3 flavours */}
            <div style={{ marginRight: "4px" }}>
              <ThemeSwitcher />
            </div>

            {/* View Mode Toggle */}
            {isMarkdown && (
              <div
                style={{
                  display: "flex",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  title="Side-by-Side Split View"
                  onClick={() => setViewMode("split")}
                  style={{
                    padding: "4px 8px",
                    background: viewMode === "split" ? "var(--accent)" : "transparent",
                    color: viewMode === "split" ? "#ffffff" : "var(--text-secondary)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 500,
                  }}
                >
                  <Columns size={13} /> Split
                </button>
                <button
                  type="button"
                  title="Markdown Preview"
                  onClick={() => setViewMode("preview")}
                  style={{
                    padding: "4px 8px",
                    background: viewMode === "preview" ? "var(--accent)" : "transparent",
                    color: viewMode === "preview" ? "#ffffff" : "var(--text-secondary)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 500,
                  }}
                >
                  <Eye size={13} /> Preview
                </button>
                <button
                  type="button"
                  title="Source Editor"
                  onClick={() => setViewMode("source")}
                  style={{
                    padding: "4px 8px",
                    background: viewMode === "source" ? "var(--accent)" : "transparent",
                    color: viewMode === "source" ? "#ffffff" : "var(--text-secondary)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 500,
                  }}
                >
                  <Code2 size={13} /> Source
                </button>
              </div>
            )}

            {/* Copy Button */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopy}
              style={{
                fontSize: "11px",
                background: "var(--surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
              title="Copy markdown text"
            >
              {copied ? <Check size={12} style={{ color: "var(--success)" }} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>

            {/* Download Button */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDownload}
              style={{
                fontSize: "11px",
                background: "var(--surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
              title="Download file"
            >
              <Download size={12} /> Download
            </button>

            {/* Save Button */}
            {isDirty && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving}
                style={{
                  fontSize: "11px",
                  background: "var(--accent)",
                  color: "#ffffff",
                  border: "none",
                  padding: "4px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
                title="Save changes to disk"
              >
                <Save size={12} /> {saving ? "Saving..." : "Save"}
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                borderRadius: "var(--radius)",
                marginLeft: "2px",
              }}
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Editor & Preview Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
          {loading ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                fontSize: "13px",
              }}
            >
              Loading {resourceName}...
            </div>
          ) : (
            <>
              {/* Source Code Editor Pane */}
              {(viewMode === "source" || viewMode === "split" || !isMarkdown) && (
                <div
                  style={{
                    flex: viewMode === "split" && isMarkdown ? "0 0 50%" : 1,
                    display: "flex",
                    background: "var(--surface)",
                    borderRight: viewMode === "split" && isMarkdown ? "1px solid var(--border)" : "none",
                    overflow: "hidden",
                  }}
                >
                  {/* Line Number Gutter */}
                  <div
                    style={{
                      width: "48px",
                      padding: "16px 8px 16px 0",
                      textAlign: "right",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "13px",
                      lineHeight: "1.6",
                      userSelect: "none",
                      background: "var(--surface-alt)",
                      borderRight: "1px solid var(--border)",
                      overflow: "hidden",
                      opacity: 0.85,
                    }}
                  >
                    {lines.map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onSelect={handleTextareaSelect}
                    onClick={handleTextareaSelect}
                    onKeyUp={handleTextareaSelect}
                    onKeyDown={handleKeyDownInEditor}
                    spellCheck={false}
                    style={{
                      flex: 1,
                      padding: "16px",
                      background: "transparent",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "13px",
                      lineHeight: "1.6",
                      border: "none",
                      outline: "none",
                      resize: "none",
                      whiteSpace: "pre",
                      overflowY: "auto",
                      overflowX: "auto",
                    }}
                  />
                </div>
              )}

              {/* VS Code Markdown Preview Pane - Fully Themed */}
              {(viewMode === "preview" || viewMode === "split") && isMarkdown && (
                <div
                  style={{
                    flex: viewMode === "split" ? "0 0 50%" : 1,
                    background: "var(--surface)",
                    overflowY: "auto",
                    padding: "24px 36px",
                  }}
                >
                  <VsCodeMarkdownRenderer source={content} onToast={onToast} />
                </div>
              )}
            </>
          )}
        </div>

        {/* VS Code Status Bar - Themed */}
        <div
          style={{
            height: "24px",
            background: "var(--accent)",
            color: "#ffffff",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            userSelect: "none",
            fontFamily: "var(--font-mono)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span>
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <span>{isMarkdown ? "Markdown" : resourceName.endsWith(".json") ? "JSON" : "JavaScript"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span>{lineCount} lines</span>
            <span>{content.length} chars</span>
            <span style={{ fontWeight: 600 }}>Theme: {config.label}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// High-Fidelity Themed Markdown Renderer
interface VsCodeMarkdownRendererProps {
  source: string;
  onToast: (msg: string, tone?: "success" | "error") => void;
}

const VsCodeMarkdownRenderer: React.FC<VsCodeMarkdownRendererProps> = ({ source, onToast }) => {
  const blocks = useMemo(() => parseMarkdownToBlocks(source), [source]);

  return (
    <div
      className="vscode-markdown-body"
      style={{
        color: "var(--text-primary)",
        lineHeight: "1.6",
        fontSize: "14px",
      }}
    >
      {blocks.map((block, idx) => (
        <React.Fragment key={idx}>{renderBlock(block, idx, onToast)}</React.Fragment>
      ))}
    </div>
  );
};

interface MarkdownBlock {
  type: "heading" | "code" | "table" | "alert" | "quote" | "list" | "hr" | "p";
  level?: number;
  text?: string;
  content?: string;
  language?: string;
  headers?: string[];
  rows?: string[][];
  alertType?: "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";
  alertBody?: string;
  items?: { text: string; checked?: boolean }[];
  ordered?: boolean;
}

function parseMarkdownToBlocks(md: string): MarkdownBlock[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Horizontal Rule
    if (/^(---|___|\*\*\*)\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    // Code Block
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({
        type: "code",
        content: codeLines.join("\n"),
        language: language || "text",
      });
      continue;
    }

    // GFM Alerts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
    const alertMatch = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.exec(line);
    if (alertMatch) {
      const alertType = alertMatch[1].toUpperCase() as "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";
      const alertLines: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].startsWith(">")) {
        alertLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({
        type: "alert",
        alertType,
        alertBody: alertLines.join("\n"),
      });
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({
        type: "quote",
        content: quoteLines.join("\n"),
      });
      continue;
    }

    // Heading (# to ######)
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      i += 1;
      continue;
    }

    // Table: | header 1 | header 2 |
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const headers = line
        .split("|")
        .slice(1, -1)
        .map((h) => h.trim());
      i += 1;
      if (i < lines.length && /^[|\s-:]+$/.test(lines[i])) {
        i += 1;
        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
          const row = lines[i]
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim());
          rows.push(row);
          i += 1;
        }
        blocks.push({
          type: "table",
          headers,
          rows,
        });
        continue;
      }
    }

    // List: unordered (*, -, +) or ordered (1.) or task lists (- [x])
    const listMatch = /^\s*([-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (listMatch) {
      const ordered = /^\s*\d+\./.test(line);
      const items: { text: string; checked?: boolean }[] = [];

      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+(.*)$/.test(lines[i])) {
        const itemLine = lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, "");
        const taskMatch = /^\[([ xX])\]\s*(.*)$/.exec(itemLine);
        if (taskMatch) {
          items.push({
            checked: taskMatch[1].toLowerCase() === "x",
            text: taskMatch[2],
          });
        } else {
          items.push({ text: itemLine });
        }
        i += 1;
      }
      blocks.push({
        type: "list",
        ordered,
        items,
      });
      continue;
    }

    // Paragraph
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) &&
      !/^(---|___|\*\*\*)\s*$/.test(lines[i]) &&
      !(lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|"))
    ) {
      pLines.push(lines[i]);
      i += 1;
    }
    blocks.push({
      type: "p",
      text: pLines.join(" "),
    });
  }

  return blocks;
}

function renderBlock(
  block: MarkdownBlock,
  key: number,
  onToast: (msg: string, tone?: "success" | "error") => void
): React.ReactNode {
  switch (block.type) {
    case "heading": {
      const styleBase: React.CSSProperties = {
        fontWeight: 600,
        color: "var(--text-primary)",
        margin: "24px 0 14px",
      };
      if (block.level === 1) {
        return (
          <h1 style={{ ...styleBase, fontSize: "1.9em", borderBottom: "2px solid var(--border)", paddingBottom: "8px" }}>
            {renderInlineSpans(block.text || "")}
          </h1>
        );
      }
      if (block.level === 2) {
        return (
          <h2 style={{ ...styleBase, fontSize: "1.45em", borderBottom: "1px solid var(--border)", paddingBottom: "6px" }}>
            {renderInlineSpans(block.text || "")}
          </h2>
        );
      }
      if (block.level === 3) {
        return <h3 style={{ ...styleBase, fontSize: "1.25em" }}>{renderInlineSpans(block.text || "")}</h3>;
      }
      return <h4 style={{ ...styleBase, fontSize: "1.1em" }}>{renderInlineSpans(block.text || "")}</h4>;
    }

    case "code": {
      return (
        <div
          style={{
            margin: "16px 0",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--surface-alt)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "6px 12px",
              background: "var(--surface-hover)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "11px",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span style={{ fontWeight: 600 }}>{block.language || "code"}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(block.content || "");
                onToast("Code copied to clipboard", "success");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                padding: "2px 6px",
                borderRadius: "var(--radius)",
              }}
              title="Copy code"
            >
              <Copy size={11} /> Copy
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: "14px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: "12.5px",
              lineHeight: 1.5,
              color: "var(--text-primary)",
              overflowX: "auto",
            }}
          >
            <code>{block.content}</code>
          </pre>
        </div>
      );
    }

    case "table": {
      return (
        <div style={{ margin: "18px 0", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid var(--border)",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ background: "var(--surface-hover)" }}>
                {block.headers?.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid var(--border)",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {renderInlineSpans(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows?.map((row, rIdx) => (
                <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? "var(--surface)" : "var(--surface-alt)" }}>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        padding: "7px 12px",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {renderInlineSpans(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "alert": {
      const type = block.alertType || "NOTE";
      let borderColor = "var(--info)";
      let bgColor = "rgba(3, 105, 161, 0.08)";
      let Icon = Info;

      if (type === "TIP") {
        borderColor = "var(--success)";
        bgColor = "rgba(21, 128, 61, 0.08)";
        Icon = Lightbulb;
      } else if (type === "IMPORTANT") {
        borderColor = "var(--accent)";
        bgColor = "var(--accent-subtle)";
        Icon = Flame;
      } else if (type === "WARNING") {
        borderColor = "var(--warning)";
        bgColor = "rgba(180, 83, 9, 0.08)";
        Icon = AlertTriangle;
      } else if (type === "CAUTION") {
        borderColor = "var(--error)";
        bgColor = "rgba(185, 28, 28, 0.08)";
        Icon = AlertOctagon;
      }

      return (
        <div
          style={{
            margin: "16px 0",
            padding: "10px 14px",
            borderLeft: `4px solid ${borderColor}`,
            background: bgColor,
            borderRadius: "0 var(--radius) var(--radius) 0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: borderColor,
              fontWeight: 600,
              fontSize: "12px",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            <Icon size={14} /> {type}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
            {block.alertBody?.split("\n").map((l, idx) => (
              <p key={idx} style={{ margin: "4px 0" }}>
                {renderInlineSpans(l)}
              </p>
            ))}
          </div>
        </div>
      );
    }

    case "quote": {
      return (
        <blockquote
          style={{
            margin: "14px 0",
            padding: "8px 16px",
            borderLeft: "4px solid var(--accent)",
            background: "var(--accent-subtle)",
            color: "var(--text-secondary)",
            borderRadius: "0 var(--radius) var(--radius) 0",
          }}
        >
          {block.content?.split("\n").map((l, idx) => (
            <p key={idx} style={{ margin: "4px 0" }}>
              {renderInlineSpans(l)}
            </p>
          ))}
        </blockquote>
      );
    }

    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag style={{ paddingLeft: "24px", margin: "12px 0" }}>
          {block.items?.map((item, idx) => (
            <li key={idx} style={{ margin: "4px 0", listStyle: item.checked !== undefined ? "none" : undefined }}>
              {item.checked !== undefined ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  {item.checked ? (
                    <CheckSquare size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  ) : (
                    <Square size={14} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                  )}
                  <span>{renderInlineSpans(item.text)}</span>
                </span>
              ) : (
                renderInlineSpans(item.text)
              )}
            </li>
          ))}
        </ListTag>
      );
    }

    case "hr": {
      return <hr style={{ height: "1px", background: "var(--border)", border: "none", margin: "24px 0" }} />;
    }

    case "p":
    default: {
      return (
        <p style={{ margin: "12px 0", lineHeight: 1.6 }}>
          {renderInlineSpans(block.text || "")}
        </p>
      );
    }
  }
}

function renderInlineSpans(text: string): React.ReactNode[] {
  const spans: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      spans.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `inline-${i++}`;

    if (token.startsWith("**")) {
      spans.push(
        <strong key={key} style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      spans.push(
        <code
          key={key}
          style={{
            background: "var(--accent-subtle)",
            padding: "2px 6px",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--accent)",
            border: "1px solid var(--border)",
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        spans.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "underline" }}
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        spans.push(token);
      }
    } else if (token.startsWith("*")) {
      spans.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    spans.push(text.slice(lastIndex));
  }

  return spans;
}
