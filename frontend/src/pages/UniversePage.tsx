import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles } from "lucide-react";
import { RepositoryUniverse, ReadmeShowcase, type HeatMapModeId } from "@/components/universe";
import { mapKnowledgeToUniverseData } from "@/components/universe/mapKnowledgeToUniverseData";
import { AIExplanationPanel } from "@/components/explanation";
import { mapExplanationToNodeExplanation } from "@/components/explanation/mapExplanationToNodeExplanation";
import { LoadingState, ErrorState } from "@/components/ui";
import { brand } from "@/theme";
import { useApiRequest } from "@/hooks/useApiRequest";
import { getExplanation, getKnowledge, type ImpactAnalysisResult } from "@/services/api";
import { SearchInsightPanel } from "@/components/search/SearchInsightPanel";
import type { SearchInsightData } from "@/components/search/types";

const UniverseToolsModal = lazy(() => import("@/components/universe/UniverseToolsModal"));

interface UniversePageProps {
  repositoryId: string;
}

export function UniversePage({ repositoryId }: UniversePageProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string | null>(null);
  const [isReadmeOpen, setIsReadmeOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);

  // Impact Radar specific state
  const [impactAnalysis, setImpactAnalysis] = useState<ImpactAnalysisResult | null>(null);

  // Heat Map state
  const [heatMapMode, setHeatMapMode] = useState<HeatMapModeId | null>(null);

  // Search Insight specific states
  const [searchInsight, setSearchInsight] = useState<SearchInsightData | null>(null);
  const [isSearchInsightOpen, setIsSearchInsightOpen] = useState(false);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[] | null>(null);

  const knowledgeRequest = useApiRequest((signal) => getKnowledge(repositoryId, signal), [repositoryId]);

  // Memoize universeData mapping so the reference identity persists across parent renders
  const universeData = useMemo(
    () => (knowledgeRequest.data ? mapKnowledgeToUniverseData(knowledgeRequest.data.knowledge) : null),
    [knowledgeRequest.data]
  );

  const nodeColorById: Record<string, string> = useMemo(
    () =>
      universeData
        ? { root: brand.coral, ...Object.fromEntries(universeData.nodes.map((node) => [node.id, node.color])) }
        : {},
    [universeData]
  );

  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      if (!universeData) return;

      // Clear search insights on manual node interaction
      setSearchInsight(null);
      setIsSearchInsightOpen(false);
      setHighlightedNodeIds(null);

      setSelectedNodeId((current) => {
        if (current === nodeId) {
          setSelectedNodeLabel(null);
          return null;
        }
        const label =
          nodeId === "root"
            ? universeData.root.label
            : (universeData.nodes.find((node) => node.id === nodeId)?.label ?? nodeId);
        setSelectedNodeLabel(label);
        return nodeId;
      });
    },
    [universeData]
  );

  const explanationQuestion =
    selectedNodeId === "root"
      ? "Give an overview of this repository."
      : `What does the ${selectedNodeId} folder do?`;

  const explanationRequest = useApiRequest(
    (signal) => getExplanation(repositoryId, explanationQuestion, signal),
    [repositoryId, selectedNodeId],
    { enabled: selectedNodeId !== null && !isSearchInsightOpen }
  );

  const explanation =
    explanationRequest.data && selectedNodeId
      ? mapExplanationToNodeExplanation(selectedNodeId, selectedNodeLabel ?? selectedNodeId, explanationRequest.data.explanation)
      : null;

  const accentColor = selectedNodeId ? (nodeColorById[selectedNodeId] ?? brand.coral) : undefined;

  const handleClosePanel = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeLabel(null);
  }, []);

  const handleSelectNodeFromTools = useCallback(
    (nodeId: string, label?: string) => {
      setIsToolsMenuOpen(false);
      setSearchInsight(null);
      setIsSearchInsightOpen(false);
      setHighlightedNodeIds(null);
      if (!universeData) return;
      const targetLabel =
        label ?? (nodeId === "root" ? universeData.root.label : (universeData.nodes.find((n) => n.id === nodeId)?.label ?? nodeId));
      setSelectedNodeId(nodeId);
      setSelectedNodeLabel(targetLabel);
    },
    [universeData]
  );

  const handleSelectSearchResult = useCallback(
    (insight: SearchInsightData, targetNodeId: string, highlightNodeIds: string[]) => {
      setIsToolsMenuOpen(false);
      setSelectedNodeId(null);
      setSelectedNodeLabel(null);

      // Store search result details
      setSearchInsight(insight);
      setIsSearchInsightOpen(true);
      setHighlightedNodeIds(highlightNodeIds);
      setSelectedNodeId(targetNodeId);
      if (universeData) {
        const label =
          targetNodeId === "root"
            ? universeData.root.label
            : (universeData.nodes.find((node) => node.id === targetNodeId)?.label ?? targetNodeId);
        setSelectedNodeLabel(label);
      }
    },
    [universeData]
  );

  const handleCloseSearchInsight = useCallback(() => {
    setIsSearchInsightOpen(false);
    setSearchInsight(null);
    setHighlightedNodeIds(null);
    setSelectedNodeId(null);
    setSelectedNodeLabel(null);
  }, []);

  const handleCloseToolsModal = useCallback(() => {
    setIsToolsMenuOpen(false);
  }, []);

  return (
    <div className="relative h-[calc(100vh-5rem)] w-full overflow-hidden flex items-center justify-center p-4 sm:p-6">
      {knowledgeRequest.loading && <LoadingState message="Loading the repository universe…" />}

      {knowledgeRequest.error && !knowledgeRequest.loading && (
        <ErrorState message={knowledgeRequest.error} onRetry={knowledgeRequest.retry} />
      )}

      {universeData && (
        <>
          <ReadmeShowcase
            owner={knowledgeRequest.data?.knowledge.repository.owner || ""}
            name={knowledgeRequest.data?.knowledge.repository.name || ""}
            knowledge={knowledgeRequest.data!.knowledge}
            selectedNodeId={selectedNodeId}
            isOpen={isReadmeOpen}
            onOpenChange={setIsReadmeOpen}
          />

          <RepositoryUniverse
            data={universeData}
            knowledge={knowledgeRequest.data?.knowledge || null}
            selectedNodeId={selectedNodeId}
            highlightedNodeIds={highlightedNodeIds}
            impactAnalysis={impactAnalysis}
            heatMapMode={heatMapMode}
            onHeatMapModeChange={setHeatMapMode}
            onNodeSelect={handleNodeSelect}
          />

          <AIExplanationPanel
            open={selectedNodeId !== null && !isSearchInsightOpen}
            title={selectedNodeLabel}
            explanation={explanation}
            loading={explanationRequest.loading}
            error={explanationRequest.error}
            accentColor={accentColor}
            onClose={handleClosePanel}
            onRetry={explanationRequest.retry}
          />

          <SearchInsightPanel
            open={isSearchInsightOpen}
            insight={searchInsight}
            onClose={handleCloseSearchInsight}
          />

          {/* Welcome Panel */}
          <AnimatePresence>
            {selectedNodeId === null && !isReadmeOpen && (
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ willChange: "transform, opacity" }}
                className="glass-panel fixed left-6 top-[120px] z-20 flex w-[calc(100vw-3rem)] sm:w-[380px] flex-col rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/[0.04] bg-void-900/65 backdrop-blur-xl"
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-coral animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-widest font-semibold">
                        Living Codebase Map
                      </span>
                    </div>
                    <h2 className="text-2xl font-black font-display text-ink truncate bg-gradient-to-r from-coral to-magenta bg-clip-text text-transparent pb-1">
                      {knowledgeRequest.data?.knowledge.repository.name || "Repository"}
                    </h2>
                    <p className="text-xs text-ink-dim font-body italic mt-1 font-semibold">
                      Explore your codebase as a living universe
                    </p>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed font-body">
                    {(knowledgeRequest.data?.knowledge.repository as any).description ||
                      "Explore files, directories, and structural relationships mapped inside a visual graph."}
                  </p>

                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => setIsReadmeOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 bg-coral hover:bg-coral-light text-void-950 font-bold text-xs transition duration-200 outline-none cursor-pointer shadow-[0_4px_12px_rgba(255,107,82,0.25)]"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Show README</span>
                    </button>
                    <button
                      onClick={() => setIsToolsMenuOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.08] text-ink font-bold text-xs transition duration-200 outline-none cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-amber" />
                      <span>Explore Universe</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lazy-loaded Extensible Universe Tools Menu Modal */}
          {isToolsMenuOpen && (
            <Suspense fallback={null}>
              <UniverseToolsModal
                isOpen={isToolsMenuOpen}
                onClose={handleCloseToolsModal}
                universeData={universeData}
                knowledge={knowledgeRequest.data?.knowledge || null}
                selectedNodeId={selectedNodeId}
                heatMapMode={heatMapMode}
                onHeatMapModeChange={setHeatMapMode}
                onSelectNode={handleSelectNodeFromTools}
                onSelectSearchResult={handleSelectSearchResult}
                onImpactAnalysisChange={setImpactAnalysis}
              />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}