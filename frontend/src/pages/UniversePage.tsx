import { useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { RepositoryUniverse, mockUniverseData } from "@/components/universe";
import { AIExplanationPanel, mockExplanationData } from "@/components/explanation";
import { GradientButton } from "@/components/ui";
import { brand } from "@/theme";

/**
 * UniversePage — composes the Repository Universe graph with the AI
 * Explanation panel. This is the only place that knows both modules
 * exist; neither `@/components/universe` nor `@/components/explanation`
 * imports from the other, so either could be reused or replaced
 * independently.
 *
 * Clicking a node toggles selection: selecting a new node opens (or
 * switches) the panel, and clicking the already-selected node again
 * closes it — a natural "toggle" rather than requiring a separate close
 * action for that case.
 *
 * The node's brand color for the panel header is looked up here (root →
 * a fixed accent, orbiting nodes → their own `color`) and passed to
 * AIExplanationPanel as a plain prop, so that component never needs to
 * know the universe module's node-color data exists.
 *
 * `onViewDashboard` is optional and purely additive — a small fixed
 * button surfacing the dashboard as the natural next step after
 * exploring the graph, without changing anything about how the graph or
 * explanation panel already behave.
 */

const nodeColorById: Record<string, string> = {
  root: brand.coral,
  ...Object.fromEntries(mockUniverseData.nodes.map((node) => [node.id, node.color])),
};

interface UniversePageProps {
  onViewDashboard?: () => void;
}

export function UniversePage({ onViewDashboard }: UniversePageProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  function handleNodeSelect(nodeId: string) {
    setSelectedNodeId((current) => (current === nodeId ? null : nodeId));
  }

  const explanation = selectedNodeId ? (mockExplanationData[selectedNodeId] ?? null) : null;
  const accentColor = selectedNodeId ? (nodeColorById[selectedNodeId] ?? brand.coral) : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-24">
      {onViewDashboard && (
        <div className="fixed right-6 top-6 z-30">
          <GradientButton variant="secondary" size="sm" leftIcon={LayoutDashboard} onClick={onViewDashboard}>
            View Dashboard
          </GradientButton>
        </div>
      )}

      <RepositoryUniverse data={mockUniverseData} selectedNodeId={selectedNodeId} onNodeSelect={handleNodeSelect} />

      <AIExplanationPanel
        open={selectedNodeId !== null}
        explanation={explanation}
        accentColor={accentColor}
        onClose={() => setSelectedNodeId(null)}
      />
    </div>
  );
}
