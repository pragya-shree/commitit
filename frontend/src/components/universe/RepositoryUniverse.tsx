import React, { useMemo, useState, useCallback } from "react";
import { cn } from "@/utils/cn";
import { brand } from "@/theme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ConnectionLayer } from "./ConnectionLayer";
import { RepositoryNode } from "./RepositoryNode";
import { OrbitingNode } from "./OrbitingNode";
import type { NodeVisualState, RepositoryUniverseData } from "./types";
import type { ImpactAnalysisResult, KnowledgeModel } from "@/services/api";
import { computeHeatMapData, type HeatMapModeId, HeatMapLegend } from "./HeatMap";

const RADIUS = 170;

function computePositions(nodeIds: string[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = { root: { x: 0, y: 0 } };
  nodeIds.forEach((id, index) => {
    const angle = (index / nodeIds.length) * Math.PI * 2 - Math.PI / 2;
    positions[id] = {
      x: Math.round(RADIUS * Math.cos(angle)),
      y: Math.round(RADIUS * Math.sin(angle)),
    };
  });
  return positions;
}

interface RepositoryUniverseProps {
  data: RepositoryUniverseData;
  knowledge?: KnowledgeModel | null;
  selectedNodeId?: string | null;
  highlightedNodeIds?: string[] | null;
  impactAnalysis?: ImpactAnalysisResult | null;
  heatMapMode?: HeatMapModeId | null;
  onHeatMapModeChange?: (mode: HeatMapModeId | null) => void;
  onNodeSelect?: (id: string) => void;
  className?: string;
}

export const RepositoryUniverse = React.memo(function RepositoryUniverse({
  data,
  knowledge = null,
  selectedNodeId = null,
  highlightedNodeIds = null,
  impactAnalysis = null,
  heatMapMode = null,
  onHeatMapModeChange,
  onNodeSelect,
  className,
}: RepositoryUniverseProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const activeId = hoveredNodeId ?? selectedNodeId;

  const positions = useMemo(() => computePositions(data.nodes.map((node) => node.id)), [data.nodes]);

  // Compute Heat Map Metrics if heatMapMode is active
  const heatMapResult = useMemo(() => {
    if (!heatMapMode || !knowledge) return null;
    return computeHeatMapData(knowledge, data, heatMapMode);
  }, [knowledge, data, heatMapMode]);

  const relatedNodeIds = useMemo(() => {
    const related = new Set<string>();
    if (!activeId) return related;
    for (const connection of data.connections) {
      if (connection.from === activeId) related.add(connection.to);
      if (connection.to === activeId) related.add(connection.from);
    }
    return related;
  }, [activeId, data.connections]);

  const hasHighlights = highlightedNodeIds && highlightedNodeIds.length > 0 && hoveredNodeId === null;

  const statusFor = useCallback(
    (id: string): NodeVisualState => {
      if (hoveredNodeId !== null) {
        if (id === hoveredNodeId) return "hovered";
        if (relatedNodeIds.has(id)) return "related";
        return "dimmed";
      }

      if (impactAnalysis && impactAnalysis.folder_states) {
        const folderState = impactAnalysis.folder_states[id];
        if (folderState === "selected" || impactAnalysis.target.id === id || impactAnalysis.target.path === id) {
          return "impact_selected";
        }
        if (folderState === "direct") return "impact_direct";
        if (folderState === "indirect") return "impact_indirect";
        if (folderState === "unaffected") return "dimmed";
      }

      if (hasHighlights) {
        if (highlightedNodeIds.includes(id)) return "hovered";
        return "dimmed";
      }

      if (heatMapMode && heatMapResult) {
        return "heatmap_active";
      }

      if (activeId === null) return "default";
      if (id === activeId) return "hovered";
      if (relatedNodeIds.has(id)) return "related";
      return "dimmed";
    },
    [activeId, hoveredNodeId, relatedNodeIds, highlightedNodeIds, hasHighlights, impactAnalysis, heatMapMode, heatMapResult]
  );

  const colorMap = useMemo(() => {
    const map: Record<string, string> = { root: brand.coral };
    data.nodes.forEach((node) => {
      map[node.id] = heatMapResult?.nodeMetrics[node.id]?.color ?? node.color;
    });
    if (heatMapResult?.nodeMetrics.root) {
      map.root = heatMapResult.nodeMetrics.root.color;
    }
    return map;
  }, [data.nodes, heatMapResult]);

  const colorFor = useCallback(
    (id: string) => colorMap[id] ?? brand.violet,
    [colorMap]
  );

  const handleHoverEnd = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  return (
    <div className="relative flex items-center justify-center">
      {/* Floating Heat Map Active Overlay Panel */}
      {heatMapMode && heatMapResult && (
        <div className="absolute top-2 right-2 z-30 w-72 sm:w-80">
          <HeatMapLegend
            compact
            activeMode={heatMapMode}
            heatMapResult={heatMapResult}
            onModeChange={(mode) => onHeatMapModeChange?.(mode)}
            onCloseOverlay={() => onHeatMapModeChange?.(null)}
          />
        </div>
      )}

      <div
        className={cn("relative mx-auto h-[440px] w-[440px] scale-[0.65] sm:scale-[0.85] lg:scale-100", className)}
      >
        <ConnectionLayer
          connections={data.connections}
          positions={positions}
          colorFor={colorFor}
          activeNodeId={activeId}
          highlightedNodeIds={hasHighlights ? highlightedNodeIds : null}
          reduceMotion={reduceMotion}
        />

        <RepositoryNode
          label={data.root.label}
          meta={data.root.meta}
          state={statusFor("root")}
          selected={selectedNodeId === "root"}
          heatMapMetrics={heatMapResult?.nodeMetrics["root"] || null}
          onHoverStart={() => setHoveredNodeId("root")}
          onHoverEnd={handleHoverEnd}
          onSelect={() => onNodeSelect?.("root")}
        />

        {data.nodes.map((node) => (
          <OrbitingNode
            key={node.id}
            node={node}
            position={positions[node.id]}
            state={statusFor(node.id)}
            selected={selectedNodeId === node.id}
            heatMapMetrics={heatMapResult?.nodeMetrics[node.id] || null}
            onHoverStart={() => setHoveredNodeId(node.id)}
            onHoverEnd={handleHoverEnd}
            onSelect={() => onNodeSelect?.(node.id)}
          />
        ))}
      </div>
    </div>
  );
});
