import { useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { RepositoryUniverse } from "@/components/universe";
import { mapKnowledgeToUniverseData } from "@/components/universe/mapKnowledgeToUniverseData";
import { AIExplanationPanel } from "@/components/explanation";
import { mapExplanationToNodeExplanation } from "@/components/explanation/mapExplanationToNodeExplanation";
import { GradientButton, LoadingState, ErrorState } from "@/components/ui";
import { brand } from "@/theme";
import { useApiRequest } from "@/hooks/useApiRequest";
import { getExplanation, getKnowledge } from "@/services/api";

/**
 * UniversePage — composes the Repository Universe graph with the AI
 * Explanation panel, both backed by real data now. This is the only
 * place that knows both `@/components/universe` and
 * `@/components/explanation` exist; neither module imports from the
 * other, so either could be reused or replaced independently. It's also
 * the only place that knows the backend exists — RepositoryUniverse and
 * AIExplanationPanel still take plain props, with no fetching logic of
 * their own.
 *
 * Clicking a node toggles selection: selecting a new node opens (or
 * switches) the panel, and clicking the already-selected node again
 * closes it. The node's label is captured at click time (already known
 * client-side, no round trip needed) and passed to AIExplanationPanel's
 * `title` immediately, while its `explanation` loads separately — see
 * mapExplanationToNodeExplanation for what's real vs. omitted in that
 * response.
 */

interface UniversePageProps {
  repositoryId: string;
  onViewDashboard?: () => void;
}

export function UniversePage({ repositoryId, onViewDashboard }: UniversePageProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string | null>(null);

  const knowledgeRequest = useApiRequest((signal) => getKnowledge(repositoryId, signal), [repositoryId]);
  const universeData = knowledgeRequest.data ? mapKnowledgeToUniverseData(knowledgeRequest.data.knowledge) : null;

  const nodeColorById: Record<string, string> = universeData
    ? { root: brand.coral, ...Object.fromEntries(universeData.nodes.map((node) => [node.id, node.color])) }
    : {};

  function handleNodeSelect(nodeId: string) {
    if (!universeData) return;

    setSelectedNodeId((current) => {
      if (current === nodeId) {
        setSelectedNodeLabel(null);
        return null;
      }
      const label = nodeId === "root" ? universeData.root.label : (universeData.nodes.find((node) => node.id === nodeId)?.label ?? nodeId);
      setSelectedNodeLabel(label);
      return nodeId;
    });
  }

  const explanationQuestion =
    selectedNodeId === "root"
      ? "Give an overview of this repository."
      : `What does the ${selectedNodeId} folder do?`;

  const explanationRequest = useApiRequest(
    (signal) => getExplanation(repositoryId, explanationQuestion, signal),
    [repositoryId, selectedNodeId],
    { enabled: selectedNodeId !== null },
  );

  const explanation =
    explanationRequest.data && selectedNodeId
      ? mapExplanationToNodeExplanation(selectedNodeId, selectedNodeLabel ?? selectedNodeId, explanationRequest.data.explanation)
      : null;

  const accentColor = selectedNodeId ? (nodeColorById[selectedNodeId] ?? brand.coral) : undefined;

  function handleClosePanel() {
    setSelectedNodeId(null);
    setSelectedNodeLabel(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-24">
      {onViewDashboard && universeData && (
        <div className="fixed right-6 top-6 z-30">
          <GradientButton variant="secondary" size="sm" leftIcon={LayoutDashboard} onClick={onViewDashboard}>
            View Dashboard
          </GradientButton>
        </div>
      )}

      {knowledgeRequest.loading && <LoadingState message="Loading the repository universe…" />}

      {knowledgeRequest.error && !knowledgeRequest.loading && (
        <ErrorState message={knowledgeRequest.error} onRetry={knowledgeRequest.retry} />
      )}

      {universeData && (
        <>
          <RepositoryUniverse data={universeData} selectedNodeId={selectedNodeId} onNodeSelect={handleNodeSelect} />

          <AIExplanationPanel
            open={selectedNodeId !== null}
            title={selectedNodeLabel}
            explanation={explanation}
            loading={explanationRequest.loading}
            error={explanationRequest.error}
            accentColor={accentColor}
            onClose={handleClosePanel}
            onRetry={explanationRequest.retry}
          />
        </>
      )}
    </div>
  );
}