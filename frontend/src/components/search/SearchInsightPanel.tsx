import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, MapPin, Folder, FileCode, Cpu, Terminal, X, Code2 } from "lucide-react";
import { transition as motionTransition, brand } from "@/theme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { SearchInsightData } from "./types";

interface SearchInsightPanelProps {
  open: boolean;
  insight: SearchInsightData | null;
  onClose: () => void;
}

export const SearchInsightPanel = React.memo(function SearchInsightPanel({
  open,
  insight,
  onClose,
}: SearchInsightPanelProps) {
  const reduceMotion = usePrefersReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const accentColor = insight?.accentColor || brand.coral;

  return (
    <AnimatePresence>
      {open && insight && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-void-950/20 sm:hidden"
            onClick={onClose}
            initial={{ opacity: reduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduceMotion ? 1 : 0 }}
          />

          {/* Slide Drawer Panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Search Insight Panel"
            style={{ willChange: "transform, opacity" }}
            className="glass-panel fixed top-20 bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] flex-col rounded-2xl sm:w-[420px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/[0.04] bg-void-900/65 backdrop-blur-2xl"
            initial={{ x: reduceMotion ? 0 : "110%" }}
            animate={{ x: 0 }}
            exit={{ x: reduceMotion ? 0 : "110%" }}
            transition={motionTransition.springSoft}
          >
            <div className="flex flex-1 flex-col overflow-hidden p-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0 animate-pulse"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-cyan" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                        Concept Insight
                      </span>
                    </div>
                    <h3 className="text-lg font-black font-display text-ink truncate">
                      {insight.title}
                    </h3>
                  </div>
                </div>

                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-ink transition duration-200 outline-none cursor-pointer"
                  title="Close Search Insight"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Scrollable Insight Content */}
              <div className="flex-1 overflow-y-auto pt-5 space-y-5 scrollbar-thin">
                {/* 1. Overview */}
                {insight.repositorySummary && (
                  <section className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-cyan flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5" />
                      Overview
                    </span>
                    <p className="text-xs text-slate-300 font-body leading-relaxed">
                      {insight.repositorySummary}
                    </p>
                  </section>
                )}

                {/* 2. Primary Location */}
                {insight.primaryLocation && (
                  <section className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-coral" />
                      Primary Location
                    </span>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-void-950/70 border border-white/[0.03] text-xs font-mono text-ink">
                      <span className="text-coral font-bold">Path:</span>
                      <span className="truncate">{insight.primaryLocation}</span>
                    </div>

                    {insight.relevantFolders.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {insight.relevantFolders.map((folder) => (
                          <span
                            key={folder}
                            className="px-2.5 py-1 rounded-md bg-void-950/60 border border-white/[0.03] text-[10px] font-mono text-slate-300 flex items-center gap-1"
                          >
                            <Folder className="h-3 w-3 text-violet" />
                            <span>{folder}/</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* 3. Relevant Files */}
                {insight.relevantFiles.length > 0 && (
                  <section className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5 text-mint" />
                      Relevant Files ({insight.relevantFiles.length})
                    </span>

                    <div className="flex flex-col gap-1.5">
                      {insight.relevantFiles.map((file) => (
                        <div
                          key={file.path}
                          className="p-2.5 rounded-lg bg-void-950/60 border border-white/[0.03] flex flex-col gap-1 text-xs font-mono"
                        >
                          <span className="text-ink font-semibold">{file.path}</span>
                          {file.explanation && (
                            <span className="text-[10px] text-slate-400 font-body leading-tight">
                              {file.explanation}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 4. Related Symbols */}
                {insight.relevantSymbols.length > 0 && (
                  <section className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                      <Code2 className="h-3.5 w-3.5 text-amber" />
                      Related Symbols ({insight.relevantSymbols.length})
                    </span>

                    <div className="flex flex-wrap gap-1.5">
                      {insight.relevantSymbols.map((sym) => (
                        <span
                          key={sym.id}
                          className="px-2.5 py-1 rounded-md bg-void-950/60 border border-amber/10 text-[10px] font-mono text-amber flex items-center gap-1"
                        >
                          <span className="opacity-60">[{sym.type}]</span>
                          <span>{sym.name}</span>
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* 5. Technologies */}
                {insight.technologiesDetected.length > 0 && (
                  <section className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-magenta" />
                      Technologies
                    </span>

                    <div className="flex flex-wrap gap-1.5">
                      {insight.technologiesDetected.map((tech) => (
                        <span
                          key={tech}
                          className="px-2.5 py-1 rounded-full bg-magenta/10 border border-magenta/20 text-[10px] font-mono text-magenta font-semibold"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* 6. Repository Evidence */}
                {insight.matchReason && (
                  <section className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col gap-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-cyan flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5" />
                      Repository Evidence
                    </span>
                    <p className="text-xs text-ink font-semibold leading-relaxed font-body">
                      {insight.matchReason}
                    </p>
                  </section>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
});
