/**
 * AI Explanation data model.
 *
 * Deliberately independent of the Repository Universe module's own data
 * (RepositoryNodeData etc.) — this module only needs a `NodeExplanation`
 * per node id and doesn't import anything from `@/components/universe`.
 * The two are tied together by whatever composes them (see
 * src/pages/UniversePage.tsx), not by a dependency between the modules
 * themselves — that keeps AIExplanationPanel reusable anywhere a
 * "node id → explanation" lookup exists, not just alongside this
 * specific graph.
 */

export interface FileReference {
  path: string;
  description?: string;
}

export interface KeyRelationship {
  /** Id of the related node, kept only as a stable reference for a future backend — not used to look up colors/icons from the universe module. */
  targetNodeId: string;
  /** Human-readable description of the relationship, e.g. "Depends on lib for shared utilities". */
  label: string;
}

export interface NodeExplanation {
  nodeId: string;
  title: string;
  summary: string;
  purpose: string;
  responsibilities: string[];
  relatedFiles: FileReference[];
  technologies: string[];
  keyRelationships: KeyRelationship[];
}
