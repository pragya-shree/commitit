import React, { useMemo, useState, useCallback } from "react";
import { cn } from "@/utils/cn";
import { brand } from "@/theme";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ConnectionLayer } from "./ConnectionLayer";
import { RepositoryNode } from "./RepositoryNode";
import { OrbitingNode } from "./OrbitingNode";
import type { NodeVisualState, RepositoryUniverseData } from "./types";

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
  selectedNodeId?: string | null;
  highlightedNodeIds?: string[] | null;
  onNodeSelect?: (id: string) => void;
  className?: string;
}

export const RepositoryUniverse = React.memo(function RepositoryUniverse({
  data,
  selectedNodeId = null,
  highlightedNodeIds = null,
  onNodeSelect,
  className,
}: RepositoryUniverseProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const activeId = hoveredNodeId ?? selectedNodeId;

  const positions = useMemo(() => computePositions(data.nodes.map((node) => node.id)), [data.nodes]);

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
      if (hasHighlights) {
        if (highlightedNodeIds.includes(id)) return "hovered";
        return "dimmed";
      }

      if (activeId === null) return "default";
      if (id === activeId) return "hovered";
      if (relatedNodeIds.has(id)) return "related";
      return "dimmed";
    },
    [activeId, relatedNodeIds, highlightedNodeIds, hasHighlights]
  );

  const colorMap = useMemo(() => {
    const map: Record<string, string> = { root: brand.coral };
    data.nodes.forEach((node) => {
      map[node.id] = node.color;
    });
    return map;
  }, [data.nodes]);

  const colorFor = useCallback(
    (id: string) => colorMap[id] ?? brand.violet,
    [colorMap]
  );

  const handleHoverEnd = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  return (
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
          onHoverStart={() => setHoveredNodeId(node.id)}
          onHoverEnd={handleHoverEnd}
          onSelect={() => onNodeSelect?.(node.id)}
        />
      ))}
    </div>
  );
});
