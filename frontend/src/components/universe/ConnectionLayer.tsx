import React from "react";
import { RepositoryConnection } from "./RepositoryConnection";
import type { ConnectionVisualState, RepositoryConnectionData } from "./types";

interface ConnectionLayerProps {
  connections: RepositoryConnectionData[];
  positions: Record<string, { x: number; y: number }>;
  colorFor: (nodeId: string) => string;
  activeNodeId: string | null;
  highlightedNodeIds?: string[] | null;
  reduceMotion: boolean;
}

export const ConnectionLayer = React.memo(function ConnectionLayer({
  connections,
  positions,
  colorFor,
  activeNodeId,
  highlightedNodeIds = null,
  reduceMotion,
}: ConnectionLayerProps) {
  return (
    <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="-220 -220 440 440" aria-hidden="true">
      {connections.map((connection, index) => {
        const from = positions[connection.from];
        const to = positions[connection.to];
        if (!from || !to) return null;

        const touchesActive = (() => {
          if (highlightedNodeIds && highlightedNodeIds.length > 0) {
            return highlightedNodeIds.includes(connection.from) && highlightedNodeIds.includes(connection.to);
          }
          return activeNodeId !== null && (connection.from === activeNodeId || connection.to === activeNodeId);
        })();

        const hasActiveState = highlightedNodeIds && highlightedNodeIds.length > 0
          ? highlightedNodeIds.length > 0
          : activeNodeId !== null;

        const state: ConnectionVisualState = !hasActiveState
          ? "default"
          : touchesActive
            ? "active"
            : "dimmed";

        return (
          <RepositoryConnection
            key={`${connection.from}-${connection.to}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            color={colorFor(connection.to)}
            state={state}
            pulseDuration={2.4 + (index % 3) * 0.5}
            pulseDelay={(index % 5) * 0.4}
            reduceMotion={reduceMotion}
          />
        );
      })}
    </svg>
  );
});
