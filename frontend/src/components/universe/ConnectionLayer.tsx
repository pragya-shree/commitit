import { RepositoryConnection } from "./RepositoryConnection";
import type { ConnectionVisualState, RepositoryConnectionData } from "./types";

/**
 * ConnectionLayer — the SVG layer rendering every connection. Owns the
 * coordinate space (a fixed viewBox matching RepositoryUniverse's stage
 * size) and derives each connection's visual state from the currently
 * active node (hovered, or falling back to selected) — RepositoryConnection
 * itself has no idea what "active" means, it just renders whatever state
 * it's given.
 *
 * Pulse timing (duration/delay) is computed here from each connection's
 * index rather than being part of the data model — it's a presentation
 * detail, not part of the graph's structure, and deriving it
 * deterministically from index keeps pulses visually staggered without
 * needing per-connection config or randomness.
 */

interface ConnectionLayerProps {
  connections: RepositoryConnectionData[];
  positions: Record<string, { x: number; y: number }>;
  colorFor: (nodeId: string) => string;
  activeNodeId: string | null;
  reduceMotion: boolean;
}

export function ConnectionLayer({ connections, positions, colorFor, activeNodeId, reduceMotion }: ConnectionLayerProps) {
  return (
    <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="-220 -220 440 440" aria-hidden="true">
      {connections.map((connection, index) => {
        const from = positions[connection.from];
        const to = positions[connection.to];
        if (!from || !to) return null;

        const touchesActive = activeNodeId !== null && (connection.from === activeNodeId || connection.to === activeNodeId);
        const state: ConnectionVisualState = activeNodeId === null ? "default" : touchesActive ? "active" : "dimmed";

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
}
