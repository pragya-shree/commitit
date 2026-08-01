import type { LucideIcon } from "lucide-react";

/**
 * Repository Universe data model.
 *
 * This is deliberately the only place that knows what a "node" or
 * "connection" is — every component in this module takes this shape (or
 * a value derived from it) as props rather than reaching for hardcoded
 * data itself. See mockUniverseData.ts for the mock dataset this
 * milestone ships with, and the module README comment in
 * RepositoryUniverse.tsx for how a real backend response would map onto
 * this same shape later.
 */

export interface RepositoryNodeData {
  /** Stable identifier, referenced by RepositoryConnectionData. */
  id: string;
  label: string;
  /** Short descriptive text shown under the label, e.g. "128 files". */
  meta?: string;
  /** Brand color hex driving this node's border/glow/icon tint. */
  color: string;
  icon: LucideIcon;
}

export interface RepositoryConnectionData {
  /** Node id, or "root" for the central repository node. */
  from: string;
  to: string;
}

export interface RepositoryUniverseData {
  root: {
    label: string;
    meta?: string;
  };
  nodes: RepositoryNodeData[];
  connections: RepositoryConnectionData[];
}

/** Shared visual state every node/connection derives from hover or impact radar: is this the hovered node, connected to it, or impact-highlighted. */
export type NodeVisualState =
  | "default"
  | "hovered"
  | "related"
  | "dimmed"
  | "impact_selected"
  | "impact_direct"
  | "impact_indirect"
  | "heatmap_active";

export type ConnectionVisualState = "default" | "active" | "dimmed";

