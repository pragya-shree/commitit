import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight, Terminal, FileText, Layers } from "lucide-react";
import { transition as motionTransition } from "@/theme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface ReadmeShowcaseProps {
  owner: string;
  name: string;
  knowledge: any;
  selectedNodeId: string | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ReadmeShowcase = React.memo(function ReadmeShowcase({
  owner,
  name,
  knowledge,
  selectedNodeId,
  isOpen: controlledIsOpen,
  onOpenChange,
}: ReadmeShowcaseProps) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : localIsOpen;

  const setIsOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    const nextValue = typeof value === "function" ? value(isOpen) : value;
    if (isControlled) {
      onOpenChange?.(nextValue);
    } else {
      setLocalIsOpen(nextValue);
    }
  };

  const [readme, setReadme] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const reduceMotion = usePrefersReducedMotion();



  // Fetch real README from Github or generate fallback summary
  useEffect(() => {
    let active = true;
    async function fetchReadme() {
      try {
        setLoading(true);
        // Try fetching main branch
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${name}/main/README.md`;
        let res = await fetch(rawUrl);
        if (!res.ok) {
          // Fallback to master branch
          const rawUrlMaster = `https://raw.githubusercontent.com/${owner}/${name}/master/README.md`;
          res = await fetch(rawUrlMaster);
        }

        if (res.ok && active) {
          const text = await res.text();
          setReadme(text);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Failed to fetch GitHub README:", err);
      }

      if (active) {
        // Build a detailed structural mock README using KnowledgeModel statistics
        const mockReadme = `# ${name}

Intelligent repository map analyzed and indexed by CommitIt.

## Repository Details
- **Developer/Owner**: \`${owner}\`
- **Total Directory Nodes**: ${knowledge.scan_summary.total_directories} directories
- **Total Code Files**: ${knowledge.scan_summary.total_files} files
- **Workspace Size**: ${knowledge.repository.size || "Unknown"}
- **Active Branch**: \`${knowledge.repository.branch || "main"}\`

## Primary Languages
${Object.entries(knowledge.languages || {})
  .slice(0, 3)
  .map(([lang, bytes]) => `- **${lang}**: ${(Number(bytes) / 1024).toFixed(1)} KB`)
  .join("\n")}

## Top-Level Directories
Below are the top-level directory entries cataloged in the code universe graph:
${knowledge.tree?.children
  ?.slice(0, 6)
  .map((child: any) => `- \`${child.name}/\` (${child.type === "directory" ? "Folder node" : "File"})`)
  .join("\n") || "- (No children found)"}

## Codebase Composition Metrics
- **Syntax Classes**: ${knowledge.parse_summary.total_classes}
- **Syntax Functions**: ${knowledge.parse_summary.total_functions}
- **Import Declarations**: ${knowledge.parse_summary.total_imports}
- **Universe Relationship Edges**: ${knowledge.graph_summary.total_edges} connections

---
*CommitIt AI-Generated Repository Overview*`;
        setReadme(mockReadme);
        setLoading(false);
      }
    }

    if (owner && name) {
      fetchReadme();
    }
  }, [owner, name, knowledge]);

  return (
    <>
      {/* Toggle button when collapsed */}
      {!isOpen && selectedNodeId !== null && (
        <button
          onClick={() => setIsOpen(true)}
          className="glass-panel fixed left-6 top-[76px] z-30 flex items-center gap-2 rounded-xl py-2.5 px-3.5 border border-white/[0.05] bg-void-900/60 hover:bg-void-900/80 text-xs font-bold text-coral hover:text-coral-light transition duration-200 outline-none cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
        >
          <BookOpen className="h-4 w-4" />
          <span>Show README</span>
          <ChevronRight className="h-3 w-3 opacity-60" />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            role="complementary"
            aria-label="Repository README Overview"
            style={{ willChange: "transform, opacity" }}
            className="glass-panel fixed top-20 bottom-4 left-4 z-30 flex w-[calc(100vw-2rem)] flex-col rounded-2xl sm:w-[420px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/[0.04] bg-void-900/65 backdrop-blur-2xl"
            initial={{ x: reduceMotion ? 0 : "-110%" }}
            animate={{ x: 0 }}
            exit={{ x: reduceMotion ? 0 : "-110%" }}
            transition={motionTransition.springSoft}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-coral" />
                <span className="text-sm font-black tracking-tight text-ink font-display">Repository Overview</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-200 transition duration-200 outline-none cursor-pointer"
                title="Collapse README"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Readme Body Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {loading ? (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-800 border-t-coral" />
                  <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase animate-pulse">Reading README...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Repo Title Summary */}
                  <div className="rounded-xl border border-white/[0.03] bg-white/[0.01] p-4.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Terminal className="h-3.5 w-3.5 text-mint" />
                      <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">{owner}</span>
                    </div>
                    <h2 className="text-xl font-bold font-display text-ink truncate mb-3">{name}</h2>
                    
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-lg bg-void-950/60 p-2 border border-white/[0.02]">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Files</div>
                        <div className="text-sm font-extrabold text-ink font-display mt-0.5">{knowledge.scan_summary.total_files}</div>
                      </div>
                      <div className="rounded-lg bg-void-950/60 p-2 border border-white/[0.02]">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Folders</div>
                        <div className="text-sm font-extrabold text-ink font-display mt-0.5">{knowledge.scan_summary.total_directories}</div>
                      </div>
                    </div>
                  </div>

                  {/* Rendered Markdown */}
                  <div className="markdown-rendered-view">
                    <Markdown content={readme} />
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
});

interface MarkdownProps {
  content: string;
}

const Markdown = React.memo(function Markdown({ content }: MarkdownProps) {
  const elements = useMemo(() => {
    const lines = content.split("\n");
    const result: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          const codeText = codeBlockLines.join("\n");
          result.push(
            <pre key={`code-${i}`} className="my-4 overflow-x-auto rounded-lg bg-void-950/80 p-3.5 font-mono text-[11px] text-mint/90 border border-white/[0.04] max-h-60 scrollbar-thin">
              <code>{codeText}</code>
            </pre>
          );
          codeBlockLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      // Headings
      if (line.startsWith("# ")) {
        result.push(
          <h1 key={i} className="mt-6 mb-3 text-2xl font-black font-display text-ink bg-gradient-to-r from-coral to-magenta bg-clip-text text-transparent border-b border-white/[0.05] pb-2">
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        result.push(
          <h2 key={i} className="mt-5 mb-2.5 text-base font-bold font-display text-ink border-b border-white/[0.03] pb-1.5 flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-coral/80" />
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        result.push(
          <h3 key={i} className="mt-4 mb-2 text-sm font-bold font-display text-ink-dim flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            {line.slice(4)}
          </h3>
        );
      }
      // List items
      else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const cleanLine = line.trim().slice(2);
        result.push(
          <li key={i} className="ml-4 list-disc text-xs text-slate-300 mb-1 leading-relaxed font-body">
            {parseInlineMarkdown(cleanLine)}
          </li>
        );
      }
      // Blockquotes
      else if (line.trim().startsWith(">")) {
        result.push(
          <blockquote key={i} className="my-3 border-l-2 border-coral bg-white/[0.01] pl-3 py-1.5 text-xs italic text-slate-400 font-body rounded-r leading-relaxed">
            {parseInlineMarkdown(line.slice(1).trim())}
          </blockquote>
        );
      }
      // Paragraph
      else if (line.trim().length > 0) {
        result.push(
          <p key={i} className="mb-3.5 text-xs text-slate-300 leading-relaxed font-body">
            {parseInlineMarkdown(line)}
          </p>
        );
      }
    }

    return result;
  }, [content]);

  return <div className="markdown-body select-text">{elements}</div>;
});

function parseInlineMarkdown(text: string): React.ReactNode {
  return <span dangerouslySetInnerHTML={{ __html: formatInlineHTML(text) }} />;
}

function formatInlineHTML(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-ink">$1</strong>');
  
  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-void-950 px-1 py-0.5 rounded font-mono text-[10px] text-mint">$1</code>');

  // Links: [label](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-coral hover:underline font-semibold">$1</a>');

  return html;
}
