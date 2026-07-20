import { Code2, Files, Folder, FolderTree, GitCompare, LayoutGrid, Network, Share2 } from "lucide-react";
import { brand } from "@/theme";
import type { KnowledgeModel, TreeNode } from "@/services/api";
import type { InsightEntry, RepositoryDashboardData } from "./types";

/**
 * Derives the real parts of RepositoryDashboardData from a backend
 * KnowledgeModel, merging them with the sections that stay mock.
 *
 * Real: file/folder counts, symbol count, relationship count (all from
 * `scan_summary`/`graph_summary`), the language breakdown (from
 * `languages`, converted to percentages here since the backend reports
 * raw file counts per language, not percentages), and — as of this
 * change — `keyInsights`, computed by `deriveKeyInsights` below purely
 * from arithmetic over these same fields. The function signature is
 * unchanged (still accepts `keyInsights` in `mockExtras`, so callers
 * like DashboardPage don't need to change) but that incoming value is
 * deliberately ignored — `keyInsights` in the returned object always
 * comes from `deriveKeyInsights`, overriding whatever `mockExtras`
 * supplied. No insight text is fabricated or LLM-generated; every
 * number shown is either copied directly from the backend response or a
 * plain derived percentage/average/ratio of it, and an insight is
 * omitted entirely rather than shown with a placeholder 0/N/A when the
 * underlying data doesn't support it (e.g. the graph-statistics insight
 * for a non-Python repository, since the backend's parser only walks
 * `.py` files).
 *
 * Still mock, passed through unchanged from `mockExtras`: `technologies`
 * (the backend is a structural code analyzer, not a package-manifest/
 * framework detector), `recentDiscoveries` (there's no endpoint that
 * returns a timestamped activity feed — the backend is stateless per
 * request), and `healthIndicators` (no scoring/health-analysis feature
 * exists on the backend at all). Forcing any of these into a real-looking
 * shape from data that doesn't exist would misrepresent what's real.
 */

const LANGUAGE_COLORS = [brand.coral, brand.violet, brand.amber, brand.mint, brand.magenta, brand.cyan];

function countDescendantFiles(node: TreeNode): number {
  if (node.type === "file") return 1;
  if (!node.children) return 0;
  return node.children.reduce((total, child) => total + countDescendantFiles(child), 0);
}

/**
 * Computes 2–4 objectively-derived insights from a KnowledgeModel, each
 * independently included only if the underlying data supports it. See
 * the module doc comment above for what "real" means here.
 */
function deriveKeyInsights(knowledge: KnowledgeModel): InsightEntry[] {
  const insights: InsightEntry[] = [];
  const { scan_summary, graph_summary, languages, tree } = knowledge;

  // 1. Language composition
  const languageEntries = Object.entries(languages).sort(([, a], [, b]) => b - a);
  const totalLanguageFiles = languageEntries.reduce((sum, [, count]) => sum + count, 0);

  if (languageEntries.length > 0 && totalLanguageFiles > 0) {
    const [topLanguage, topCount] = languageEntries[0];
    const topPercentage = Math.round((topCount / totalLanguageFiles) * 100);

    insights.push({
      id: "language-composition",
      title:
        languageEntries.length > 1
          ? `${topPercentage}% ${topLanguage}, ${languageEntries.length} languages total`
          : `${topPercentage}% ${topLanguage}`,
      description:
        languageEntries.length > 1
          ? `${topLanguage} accounts for ${topCount} of ${totalLanguageFiles} recognized files (${topPercentage}%), across ${languageEntries.length} languages detected in this repository.`
          : `All ${totalLanguageFiles} recognized files in this repository are ${topLanguage}.`,
      icon: Code2,
      color: brand.coral,
    });
  }

  // 2. Repository scale
  if (scan_summary.total_files > 0) {
    insights.push({
      id: "repository-scale",
      title: `${scan_summary.total_files.toLocaleString()} files across ${scan_summary.total_directories.toLocaleString()} folders`,
      description:
        scan_summary.total_directories > 0
          ? `An average of ${Math.round((scan_summary.total_files / scan_summary.total_directories) * 10) / 10} files per folder.`
          : "All files are at the repository root.",
      icon: LayoutGrid,
      color: brand.violet,
    });
  }

  // 3. Symbol graph statistics — omitted entirely when the backend
  // couldn't build a dependency graph (e.g. a non-Python repository),
  // rather than shown as "0 symbols".
  if (graph_summary.total_nodes > 0) {
    const density = Math.round((graph_summary.total_edges / graph_summary.total_nodes) * 10) / 10;

    insights.push({
      id: "graph-statistics",
      title: `${graph_summary.total_nodes.toLocaleString()} symbols, ${graph_summary.total_edges.toLocaleString()} relationships`,
      description: `The dependency graph connects ${graph_summary.total_nodes.toLocaleString()} modules, classes, and functions through ${graph_summary.total_edges.toLocaleString()} import, call, and inheritance relationships — an average of ${density} relationships per symbol.`,
      icon: Share2,
      color: brand.mint,
    });
  }

  // 4. Largest top-level folder
  const topLevelDirectories = (tree.children ?? []).filter((child) => child.type === "directory");

  if (topLevelDirectories.length > 0 && scan_summary.total_files > 0) {
    const ranked = topLevelDirectories
      .map((directory) => ({ name: directory.name, fileCount: countDescendantFiles(directory) }))
      .sort((a, b) => b.fileCount - a.fileCount);
    const largest = ranked[0];

    if (largest.fileCount > 0) {
      const percentage = Math.round((largest.fileCount / scan_summary.total_files) * 100);

      insights.push({
        id: "largest-folder",
        title: `${largest.name}/ is the largest folder`,
        description: `${largest.name}/ contains ${largest.fileCount.toLocaleString()} files — ${percentage}% of the repository.`,
        icon: Folder,
        color: brand.amber,
      });
    }
  }

  return insights;
}

export function mapKnowledgeToDashboardData(
  knowledge: KnowledgeModel,
  mockExtras: Pick<RepositoryDashboardData, "technologies" | "keyInsights" | "recentDiscoveries" | "healthIndicators">,
): RepositoryDashboardData {
  const totalLanguageFiles = Object.values(knowledge.languages).reduce((total, count) => total + count, 0);
  const languageEntries = Object.entries(knowledge.languages).sort(([, a], [, b]) => b - a);

  const languageBreakdown = languageEntries.map(([name, count], index) => ({
    name,
    percentage: totalLanguageFiles > 0 ? Math.round((count / totalLanguageFiles) * 100) : 0,
    color: LANGUAGE_COLORS[index % LANGUAGE_COLORS.length],
  }));

  return {
    repository: {
      name: `${knowledge.repository.owner}/${knowledge.repository.name}`,
      owner: knowledge.repository.owner,
      branch: knowledge.repository.branch ?? "main",
      description: `A repository with ${knowledge.scan_summary.total_files} files across ${knowledge.scan_summary.total_directories} folders.`,
      analyzedAt: new Date(knowledge.created_at).toLocaleString(),
    },
    metrics: [
      {
        id: "files",
        label: "Files analyzed",
        value: knowledge.scan_summary.total_files.toLocaleString(),
        numericValue: knowledge.scan_summary.total_files,
        icon: Files,
        color: brand.coral,
      },
      {
        id: "folders",
        label: "Folders",
        value: knowledge.scan_summary.total_directories.toLocaleString(),
        numericValue: knowledge.scan_summary.total_directories,
        icon: FolderTree,
        color: brand.violet,
      },
      {
        id: "symbols",
        label: "Symbols analyzed",
        value: knowledge.graph_summary.total_nodes.toLocaleString(),
        numericValue: knowledge.graph_summary.total_nodes,
        icon: Network,
        color: brand.mint,
      },
      {
        id: "relationships",
        label: "Relationships mapped",
        value: knowledge.graph_summary.total_edges.toLocaleString(),
        numericValue: knowledge.graph_summary.total_edges,
        icon: GitCompare,
        color: brand.amber,
      },
    ],
    languageBreakdown,
    ...mockExtras,
    keyInsights: deriveKeyInsights(knowledge),
  };
}