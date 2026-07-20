import { Component, FileCode, FlaskConical, Folder, Package, Palette, Server, type LucideIcon } from "lucide-react";
import { brand } from "@/theme";
import type { GraphEdge, GraphNode, KnowledgeModel, TreeNode } from "@/services/api";
import type { RepositoryConnectionData, RepositoryUniverseData } from "./types";

/**
 * Derives real RepositoryUniverseData from a backend KnowledgeModel.
 *
 * What's real: node labels and file counts come directly from
 * `knowledge.tree` (the actual top-level directories and their
 * descendant file counts); root-to-folder connections reflect the
 * repository's real structure; folder-to-folder connections are
 * aggregated from the backend's real symbol-level dependency graph
 * (`knowledge.nodes`/`edges`) — see `deriveFolderRelationships` below
 * for exactly how. Colors and icons are the one frontend-only
 * presentation choice here — assigned from the brand palette and a
 * small folder-name heuristic, since there's no such thing as a repo's
 * "real" color.
 */

const NODE_COLORS = [brand.coral, brand.violet, brand.mint, brand.amber, brand.magenta, brand.cyan];
const MAX_FOLDER_NODES = 8;

const ICON_BY_FOLDER_NAME: Record<string, LucideIcon> = {
  src: FileCode,
  app: FileCode,
  components: Component,
  ui: Component,
  lib: Package,
  utils: Package,
  api: Server,
  server: Server,
  routes: Server,
  styles: Palette,
  css: Palette,
  test: FlaskConical,
  tests: FlaskConical,
  __tests__: FlaskConical,
};

function iconForFolderName(name: string): LucideIcon {
  return ICON_BY_FOLDER_NAME[name.toLowerCase()] ?? Folder;
}

function countDescendantFiles(node: TreeNode): number {
  if (node.type === "file") return 1;
  if (!node.children) return 0;
  return node.children.reduce((total, child) => total + countDescendantFiles(child), 0);
}

/**
 * A backend graph node's id is a dotted path derived from its file's
 * relative path (e.g. `app/services/git.py` → module id
 * `app.services.git`; a class/function inside it nests further, e.g.
 * `app.services.git.GitService`). The top-level folder is simply the
 * first dot-segment — the same name our `tree`-derived folder nodes
 * already use as their id.
 */
function topLevelFolderOf(symbolId: string): string {
  return symbolId.split(".")[0];
}

/**
 * Aggregates the backend's real symbol-level dependency graph
 * (`imports`/`inherits`/`calls` edges between modules, classes, and
 * functions) into deduplicated, directed folder-to-folder connections.
 *
 * Only edges between two ids that actually appear in `nodes` are
 * trusted — `graph_service.py` also records "best-effort external
 * nodes" for imports/calls/inheritance targets it couldn't resolve to a
 * definition inside the repository, and those ids don't reliably follow
 * the internal dotted-module-path convention (they could just be a raw
 * external package name). Requiring both endpoints to be confirmed
 * internal symbols avoids misinterpreting one of those as a folder path.
 *
 * A resolved folder is only kept if it's one of the folders we're
 * actually rendering (`knownFolderIds` — the same top-`MAX_FOLDER_NODES`
 * ranked set used for the hub-and-spoke connections), so this never
 * references a node that doesn't exist in the graph. Self-loops (a
 * folder relating to itself) are dropped, and each `(source, target)`
 * folder pair is deduplicated regardless of how many individual symbol
 * edges — or which relationship types — produced it, since
 * `RepositoryConnectionData` has no relationship-type field to
 * distinguish them by.
 */
function deriveFolderRelationships(
  nodes: GraphNode[],
  edges: GraphEdge[],
  knownFolderIds: Set<string>,
): RepositoryConnectionData[] {
  const knownSymbolIds = new Set(nodes.map((node) => node.id));
  const seenPairs = new Set<string>();
  const relationships: RepositoryConnectionData[] = [];

  for (const edge of edges) {
    if (!knownSymbolIds.has(edge.source) || !knownSymbolIds.has(edge.target)) continue;

    const sourceFolder = topLevelFolderOf(edge.source);
    const targetFolder = topLevelFolderOf(edge.target);

    if (!knownFolderIds.has(sourceFolder) || !knownFolderIds.has(targetFolder)) continue;
    if (sourceFolder === targetFolder) continue;

    const pairKey = `${sourceFolder}->${targetFolder}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    relationships.push({ from: sourceFolder, to: targetFolder });
  }

  return relationships;
}

export function mapKnowledgeToUniverseData(knowledge: KnowledgeModel): RepositoryUniverseData {
  const topLevelDirectories = (knowledge.tree.children ?? []).filter((child) => child.type === "directory");

  const rankedFolders = topLevelDirectories
    .map((directory) => ({ directory, fileCount: countDescendantFiles(directory) }))
    .sort((a, b) => b.fileCount - a.fileCount)
    .slice(0, MAX_FOLDER_NODES);

  const nodes = rankedFolders.map(({ directory, fileCount }, index) => ({
    id: directory.name,
    label: directory.name,
    meta: `${fileCount} file${fileCount === 1 ? "" : "s"}`,
    color: NODE_COLORS[index % NODE_COLORS.length],
    icon: iconForFolderName(directory.name),
  }));

  const folderIds = new Set(nodes.map((node) => node.id));
  const rootConnections: RepositoryConnectionData[] = nodes.map((node) => ({ from: "root", to: node.id }));
  const folderRelationships = deriveFolderRelationships(knowledge.nodes, knowledge.edges, folderIds);
  const connections = [...rootConnections, ...folderRelationships];

  const repositoryLabel = `${knowledge.repository.owner}/${knowledge.repository.name}`;

  return {
    root: {
      label: repositoryLabel,
      meta: `${knowledge.scan_summary.total_files} files · ${knowledge.scan_summary.total_directories} folders`,
    },
    nodes,
    connections,
  };
}