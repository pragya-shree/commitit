import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Compass, Zap, ArrowLeft, X, ChevronRight } from "lucide-react";
import { brand } from "@/theme";
import type { KnowledgeModel } from "@/services/api";
import type { RepositoryUniverseData } from "./types";
import { UniverseSearch } from "./UniverseSearch";
import { StartHere } from "./StartHere/StartHere";
import { ImpactRadar } from "./ImpactRadar/ImpactRadar";
import type { SearchInsightData } from "@/components/search/types";

interface UniverseToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  universeData: RepositoryUniverseData | null;
  knowledge?: KnowledgeModel | null;
  onSelectNode?: (targetNodeId: string, targetNodeLabel: string) => void;
  onSelectSearchResult?: (insight: SearchInsightData, targetNodeId: string, highlightNodeIds: string[]) => void;
}

export const UniverseToolsModal = React.memo(function UniverseToolsModal({
  isOpen,
  onClose,
  universeData,
  knowledge = null,
  onSelectNode,
  onSelectSearchResult,
}: UniverseToolsModalProps) {
  const [activeToolIndex, setActiveToolIndex] = useState<number | null>(null);

  const handleClose = useCallback(() => {
    setActiveToolIndex(null);
    onClose();
  }, [onClose]);

  const handleBackToMenu = useCallback(() => {
    setActiveToolIndex(null);
  }, []);

  const handleSelectSearchResult = useCallback(
    (insight: SearchInsightData, targetNodeId: string, highlightNodeIds: string[]) => {
      onSelectSearchResult?.(insight, targetNodeId, highlightNodeIds);
      handleClose();
    },
    [onSelectSearchResult, handleClose]
  );

  const handleSelectStartNode = useCallback(
    (nodeId: string, label: string) => {
      onSelectNode?.(nodeId, label);
      handleClose();
    },
    [onSelectNode, handleClose]
  );

  const universeTools = [
    {
      title: "Universe Search",
      description: "Search the repository by meaning and discover where concepts/features exist.",
      icon: Search,
      color: brand.cyan,
      emoji: "🌌",
      sub: "Semantic search across folders and files"
    },
    {
      title: "Start Here",
      description: "Learn where to begin exploring and parsing this codebase from real analysis.",
      icon: Compass,
      color: brand.mint,
      emoji: "🚪",
      sub: "Evidence-based onboarding checkpoints"
    },
    {
      title: "Impact Radar",
      description: "Understand what parts of the code may be affected by changes.",
      icon: Zap,
      color: brand.coral,
      emoji: "⚡",
      sub: "Predictive blast radius analyzer"
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-void-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: "transform, opacity" }}
            className="glass-panel fixed z-50 max-w-2xl w-full bg-void-900/90 rounded-3xl border border-white/[0.08] shadow-[0_24px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                {activeToolIndex !== null ? (
                  <button
                    onClick={handleBackToMenu}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-100 transition duration-200 cursor-pointer"
                    title="Back to Tools"
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                  </button>
                ) : (
                  <Compass className="h-5 w-5 text-amber animate-pulse" />
                )}
                <div>
                  <h3 className="text-lg font-black font-display text-ink flex items-center gap-1.5">
                    {activeToolIndex !== null
                      ? `${universeTools[activeToolIndex].emoji} ${universeTools[activeToolIndex].title}`
                      : "Universe Tools Menu"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {activeToolIndex !== null
                      ? universeTools[activeToolIndex].sub
                      : "Discover interactive ways to navigate and analyze your codebase"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-slate-200 transition duration-200 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {activeToolIndex === null ? (
                /* Grid of Tools - 2 Column Layout with empty spaces preserved */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {universeTools.map((tool, idx) => {
                    const IconComp = tool.icon;
                    return (
                      <button
                        key={tool.title}
                        onClick={() => setActiveToolIndex(idx)}
                        className="group flex flex-col items-start text-left p-5 rounded-2xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 relative overflow-hidden outline-none cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                      >
                        {/* Background color glow on hover */}
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 pointer-events-none"
                          style={{ backgroundColor: tool.color }}
                        />
                        <div className="flex items-center gap-3 mb-2.5">
                          <div
                            className="p-2.5 rounded-xl border transition-colors duration-300"
                            style={{
                              borderColor: `${tool.color}20`,
                              backgroundColor: `${tool.color}0a`,
                              color: tool.color
                            }}
                          >
                            <IconComp className="h-5 w-5" />
                          </div>
                          <h4 className="font-bold text-ink font-display group-hover:text-coral transition-colors duration-300">
                            {tool.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 font-body leading-relaxed">
                          {tool.description}
                        </p>
                        <div className="mt-4 flex items-center text-[10px] font-bold text-coral opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-1">
                          <span>Launch Interface</span>
                          <ChevronRight className="h-3 w-3" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Individual Tool Views */
                <div className="min-h-[300px]">
                  {activeToolIndex === 0 && (
                    <UniverseSearch
                      knowledge={knowledge}
                      universeData={universeData}
                      onSelectResult={handleSelectSearchResult}
                    />
                  )}

                  {activeToolIndex === 1 && (
                    <StartHere
                      knowledge={knowledge}
                      onSelectNode={handleSelectStartNode}
                    />
                  )}

                  {activeToolIndex === 2 && (
                    <ImpactRadar />
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/[0.04] bg-void-950/40 flex justify-between items-center text-[10px] font-mono text-slate-500 font-semibold">
              <span>CommitIt v1.0 AI Telemetry</span>
              {activeToolIndex !== null && (
                <button
                  onClick={handleBackToMenu}
                  className="text-coral hover:underline cursor-pointer"
                >
                  Back to menu
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default UniverseToolsModal;
