import React, { useState } from "react";
import { Copy, Check, ExternalLink, ChevronRight } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  onSelectFile?: (filePath: string) => void;
  onSelectSymbol?: (symbolName: string) => void;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl bg-void-950 border border-white/10 overflow-hidden shadow-xl group">
      {/* Code Fence Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-void-900/90 border-b border-white/[0.06] text-xs font-mono">
        <span className="text-[11px] font-bold text-cyan tracking-wider uppercase">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.1] transition-all cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-mint" />
              <span className="text-mint font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed whitespace-pre font-normal scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const MermaidDiagramBlock: React.FC<{ code: string }> = ({ code }) => {
  const lines = code
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("graph") && !l.startsWith("flowchart") && !l.startsWith("sequenceDiagram"));

  const parsedSteps: string[] = [];
  lines.forEach((line) => {
    const matches = line.match(/\[(.*?)\]|([A-Za-z0-9_\.\/]+)/g);
    if (matches) {
      matches.forEach((m) => {
        const clean = m.replace(/[\[\]]/g, "").trim();
        if (clean && clean !== "-->" && clean !== "->" && !parsedSteps.includes(clean)) {
          parsedSteps.push(clean);
        }
      });
    }
  });

  const displaySteps = parsedSteps.length > 0 ? parsedSteps : ["HTTP Route", "Security Guard", "Service Layer", "Database"];

  return (
    <div className="my-4 p-4 rounded-2xl bg-void-950/80 border border-cyan/30 backdrop-blur-xl shadow-lg">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.06]">
        <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
        <span className="text-xs font-mono font-bold text-cyan uppercase tracking-wider">
          Architecture Flowchart Diagram
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 py-2">
        {displaySteps.map((step, idx) => (
          <React.Fragment key={idx}>
            <div className="px-3 py-2 rounded-xl bg-void-900 border border-cyan/40 text-xs font-mono font-bold text-slate-200 shadow-md flex items-center gap-1.5 hover:border-cyan transition-colors">
              <span className="w-4 h-4 rounded-full bg-cyan/20 text-cyan text-[10px] flex items-center justify-center">
                {idx + 1}
              </span>
              <span>{step}</span>
            </div>
            {idx < displaySteps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-cyan/70 shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming = false,
  onSelectFile,
  onSelectSymbol,
}) => {
  if (!content) return null;

  const segments: React.ReactNode[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_\-+]*)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      segments.push(renderMarkdownText(textBefore, `text-${lastIndex}`, onSelectFile, onSelectSymbol));
    }

    const language = match[1].trim();
    const code = match[2];

    if (language === "mermaid") {
      segments.push(<MermaidDiagramBlock key={`mermaid-${match.index}`} code={code} />);
    } else {
      segments.push(<CodeBlock key={`code-${match.index}`} language={language} code={code} />);
    }

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    segments.push(renderMarkdownText(remainingText, `text-${lastIndex}`, onSelectFile, onSelectSymbol));
  }

  return (
    <div className="markdown-content text-sm text-slate-200 leading-relaxed font-sans space-y-2">
      {segments}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-cyan animate-pulse rounded-sm align-middle" title="Generating response..." />
      )}
    </div>
  );
};

function renderMarkdownText(
  text: string,
  keyPrefix: string,
  onSelectFile?: (filePath: string) => void,
  onSelectSymbol?: (symbolName: string) => void
): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (tKey: string) => {
    if (!inTable) return;
    elements.push(
      <div key={tKey} className="my-3 overflow-x-auto rounded-xl border border-white/10 shadow-lg">
        <table className="w-full text-xs text-left text-slate-200 font-sans border-collapse">
          <thead className="bg-void-900/90 text-cyan uppercase tracking-wider font-mono border-b border-white/10">
            <tr>
              {tableHeaders.map((h, i) => (
                <th key={i} className="px-3 py-2.5 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {tableRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-white/[0.03] transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 leading-relaxed">
                    {parseInlineFormatting(cell, `tbl-${rIdx}-${cIdx}`, onSelectFile, onSelectSymbol)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    inTable = false;
    tableHeaders = [];
    tableRows = [];
  };

  lines.forEach((line: string, idx: number) => {
    const lKey = `${keyPrefix}-line-${idx}`;

    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const cells = line
        .split("|")
        .map((cellStr: string) => cellStr.trim())
        .filter((_: string, cIdx: number, arr: string[]) => cIdx > 0 && cIdx < arr.length - 1);

      if (cells.every((cellContent: string) => /^:?-+:?$/.test(cellContent))) {
        return;
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      flushTable(`${lKey}-tbl-flush`);
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={lKey} className="text-base font-bold text-white mt-4 mb-1.5 font-display border-b border-white/[0.06] pb-1">
          {parseInlineFormatting(line.replace("### ", ""), lKey, onSelectFile, onSelectSymbol)}
        </h3>
      );
      return;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={lKey} className="text-lg font-extrabold text-white mt-5 mb-2 font-display bg-gradient-to-r from-coral to-magenta bg-clip-text text-transparent">
          {parseInlineFormatting(line.replace("## ", ""), lKey, onSelectFile, onSelectSymbol)}
        </h2>
      );
      return;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={lKey} className="text-xl font-black text-white mt-6 mb-2 font-display">
          {parseInlineFormatting(line.replace("# ", ""), lKey, onSelectFile, onSelectSymbol)}
        </h1>
      );
      return;
    }

    if (line.trim().startsWith("• ") || line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const content = line.trim().substring(2);
      elements.push(
        <div key={lKey} className="flex items-start gap-2 ml-2 my-0.5 text-slate-300">
          <span className="text-coral font-bold text-xs mt-0.5">•</span>
          <span>{parseInlineFormatting(content, lKey, onSelectFile, onSelectSymbol)}</span>
        </div>
      );
      return;
    }

    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={lKey} className="flex items-start gap-2 ml-2 my-0.5 text-slate-300">
          <span className="font-mono text-cyan font-bold text-xs shrink-0">{numMatch[1]}.</span>
          <span>{parseInlineFormatting(numMatch[2], lKey, onSelectFile, onSelectSymbol)}</span>
        </div>
      );
      return;
    }

    if (!line.trim()) {
      elements.push(<div key={lKey} className="h-1.5" />);
      return;
    }

    elements.push(
      <p key={lKey} className="my-0.5 text-slate-200">
        {parseInlineFormatting(line, lKey, onSelectFile, onSelectSymbol)}
      </p>
    );
  });

  if (inTable) {
    flushTable(`${keyPrefix}-final-tbl`);
  }

  return <React.Fragment key={keyPrefix}>{elements}</React.Fragment>;
}

function parseInlineFormatting(
  text: string,
  keyPrefix: string,
  onSelectFile?: (filePath: string) => void,
  onSelectSymbol?: (symbolName: string) => void
): React.ReactNode {
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    const subKey = `${keyPrefix}-sub-${match.index}`;

    if (token.startsWith("`") && token.endsWith("`")) {
      const codeVal = token.substring(1, token.length - 1);
      const isFile = codeVal.includes(".py") || codeVal.includes(".ts") || codeVal.includes(".js") || codeVal.includes("/");
      parts.push(
        <code
          key={subKey}
          onClick={() => (isFile ? onSelectFile?.(codeVal) : onSelectSymbol?.(codeVal))}
          className={`font-mono text-xs px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 ${
            isFile ? "text-cyan hover:underline cursor-pointer" : "text-violet-300 font-semibold"
          }`}
        >
          {codeVal}
        </code>
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={subKey} className="font-bold text-white">
          {token.substring(2, token.length - 2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={subKey} className="italic text-slate-300">
          {token.substring(1, token.length - 1)}
        </em>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const label = linkMatch[1];
        const url = linkMatch[2];
        parts.push(
          <a
            key={subKey}
            href={url}
            onClick={(e) => {
              if (url.startsWith("file://") || label.includes(".py")) {
                e.preventDefault();
                onSelectFile?.(label);
              }
            }}
            className="inline-flex items-center gap-0.5 font-semibold text-coral hover:underline"
          >
            <span>{label}</span>
            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
          </a>
        );
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <React.Fragment key={keyPrefix}>{parts}</React.Fragment>;
}
