import { type ReactNode } from "react";

// Minimal, injection-safe markdown renderer: everything is rendered as React
// text nodes; raw HTML in the source is never evaluated.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-i${i++}`;
    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

export function renderMarkdown(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <pre key={`b${key++}`} className="md-code">
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2], `h${key}`);
      if (level === 1) blocks.push(<h1 key={`b${key++}`} className="md-h1">{content}</h1>);
      else if (level === 2) blocks.push(<h2 key={`b${key++}`} className="md-h2">{content}</h2>);
      else if (level === 3) blocks.push(<h3 key={`b${key++}`} className="md-h3">{content}</h3>);
      else blocks.push(<h4 key={`b${key++}`} className="md-h4">{content}</h4>);
      i += 1;
      continue;
    }

    if (/^\s*([-*+]\s+|\d+\.\s+)/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]\s+|\d+\.\s+)/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*+]\s+|\d+\.\s+)/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={`b${key++}`} className="md-list">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `l${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("```") && !/^(#{1,4})\s+/.test(lines[i]) && !/^\s*([-*+]\s+|\d+\.\s+)/.test(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push(<p key={`b${key++}`} className="md-p">{renderInline(paragraph.join(" "), `p${key}`)}</p>);
  }

  return blocks;
}
