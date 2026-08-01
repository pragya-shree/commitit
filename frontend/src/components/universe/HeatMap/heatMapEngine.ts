import type { KnowledgeModel, TreeNode } from "@/services/api";
import type { RepositoryUniverseData } from "../types";

export type HeatMapModeId = "dependency_count" | "complexity" | "risk";

export interface HeatMapModeConfig {
  id: HeatMapModeId;
  label: string;
  emoji: string;
  description: string;
  unit: string;
  colorScale: {
    low: string;
    mid: string;
    high: string;
    critical: string;
  };
}

export const HEAT_MAP_MODES: Record<HeatMapModeId, HeatMapModeConfig> = {
  dependency_count: {
    id: "dependency_count",
    label: "Dependency Count",
    emoji: "🔗",
    description: "Highlights nodes based on total incoming (fan-in) and outgoing (fan-out) dependency connections.",
    unit: "deps",
    colorScale: { low: "#06b6d4", mid: "#10b981", high: "#f59e0b", critical: "#ff6b52" },
  },
  complexity: {
    id: "complexity",
    label: "Complexity",
    emoji: "🧩",
    description: "Estimates structural complexity using file counts, classes, functions, and internal symbol density.",
    unit: "pts",
    colorScale: { low: "#06b6d4", mid: "#10b981", high: "#f59e0b", critical: "#ff6b52" },
  },
  risk: {
    id: "risk",
    label: "Architectural Risk",
    emoji: "⚡",
    description: "Surfaces architectural risk hotspots by combining fan-in, fan-out, centrality, and entry-point importance.",
    unit: "/ 100",
    colorScale: { low: "#06b6d4", mid: "#10b981", high: "#f59e0b", critical: "#ef4444" },
  },
};

export interface NodeHeatMapMetrics {
  nodeId: string;
  label: string;
  rawScore: number;
  normalizedScore: number; // 0.0 to 1.0
  color: string;
  glowColor: string;
  scale: number;

  // Granular metrics for tooltip
  fanIn: number;
  fanOut: number;
  totalDependencies: number;
  fileCount: number;
  classCount: number;
  functionCount: number;
  symbolCount: number;
  centrality: number;
  isEntryPoint: boolean;
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface HeatMapResult {
  mode: HeatMapModeId;
  nodeMetrics: Record<string, NodeHeatMapMetrics>;
  summaryStats: {
    highestRiskNode: { label: string; score: number } | null;
    highestComplexityNode: { label: string; score: number } | null;
    averageScore: number;
    maxScore: number;
    totalEvaluatedNodes: number;
  };
}

const ENTRY_POINT_KEYWORDS = ["route", "routes", "main", "app", "api", "server", "cli", "index", "handler", "controller"];

function countDescendantFiles(node: TreeNode): number {
  if (node.type === "file") return 1;
  if (!node.children) return 0;
  return node.children.reduce((total, child) => total + countDescendantFiles(child), 0);
}

function findDirectoryInTree(rootNode: TreeNode, dirName: string): TreeNode | null {
  if (rootNode.type === "directory" && rootNode.name.toLowerCase() === dirName.toLowerCase()) {
    return rootNode;
  }
  if (rootNode.children) {
    for (const child of rootNode.children) {
      const found = findDirectoryInTree(child, dirName);
      if (found) return found;
    }
  }
  return null;
}

function interpolateColor(score: number): string {
  // score in [0.0, 1.0]
  // 0.00: Cyan #06b6d4
  // 0.33: Mint/Emerald #10b981
  // 0.66: Amber #f59e0b
  // 1.00: Coral/Flame #ef4444
  if (score <= 0.33) {
    const t = score / 0.33;
    return blendHex("#06b6d4", "#10b981", t);
  } else if (score <= 0.66) {
    const t = (score - 0.33) / 0.33;
    return blendHex("#10b981", "#f59e0b", t);
  } else {
    const t = (score - 0.66) / 0.34;
    return blendHex("#f59e0b", "#ef4444", t);
  }
}

function blendHex(c1: string, c2: string, ratio: number): string {
  const r1 = parseInt(c1.substring(1, 3), 16);
  const g1 = parseInt(c1.substring(3, 5), 16);
  const b1 = parseInt(c1.substring(5, 7), 16);

  const r2 = parseInt(c2.substring(1, 3), 16);
  const g2 = parseInt(c2.substring(3, 5), 16);
  const b2 = parseInt(c2.substring(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function computeHeatMapData(
  knowledge: KnowledgeModel | null,
  universeData: RepositoryUniverseData | null,
  mode: HeatMapModeId
): HeatMapResult {
  const nodeMetrics: Record<string, NodeHeatMapMetrics> = {};
  const emptyResult: HeatMapResult = {
    mode,
    nodeMetrics: {},
    summaryStats: {
      highestRiskNode: null,
      highestComplexityNode: null,
      averageScore: 0,
      maxScore: 0,
      totalEvaluatedNodes: 0,
    },
  };

  if (!knowledge || !universeData) return emptyResult;

  const targetNodeIds = ["root", ...universeData.nodes.map((n) => n.id)];

  // Helper map: top-level symbol folder prefixes
  const symbolToNodeMap = new Map<string, string>();
  knowledge.nodes.forEach((node) => {
    const topFolder = node.id.split(".")[0].split(":")[0];
    symbolToNodeMap.set(node.id, topFolder);
  });

  // Calculate per-node raw metrics
  const rawScores: Record<string, number> = {};
  const perNodeData: Record<
    string,
    {
      fanIn: number;
      fanOut: number;
      totalDeps: number;
      fileCount: number;
      classCount: number;
      funcCount: number;
      symbolCount: number;
      centrality: number;
      isEntryPoint: boolean;
      complexityScore: number;
      riskScore: number;
    }
  > = {};

  targetNodeIds.forEach((id) => {
    let fileCount = 0;
    if (id === "root") {
      fileCount = knowledge.scan_summary.total_files;
    } else {
      const dirNode = findDirectoryInTree(knowledge.tree, id);
      fileCount = dirNode ? countDescendantFiles(dirNode) : 1;
    }

    // Symbols in node
    const nodeSymbols = knowledge.nodes.filter((n) => {
      if (id === "root") return true;
      const top = n.id.split(".")[0].split(":")[0];
      return top.toLowerCase() === id.toLowerCase();
    });

    const symbolCount = nodeSymbols.length;
    const classCount = nodeSymbols.filter((n) => n.type === "class").length;
    const funcCount = nodeSymbols.filter((n) => n.type === "function").length;

    // Fan-in & Fan-out
    let fanIn = 0;
    let fanOut = 0;

    knowledge.edges.forEach((edge) => {
      const srcNode = symbolToNodeMap.get(edge.source) || edge.source.split(".")[0];
      const tgtNode = symbolToNodeMap.get(edge.target) || edge.target.split(".")[0];

      const isSrcMatch = srcNode.toLowerCase() === id.toLowerCase();
      const isTgtMatch = tgtNode.toLowerCase() === id.toLowerCase();

      if (isTgtMatch && !isSrcMatch) fanIn++;
      if (isSrcMatch && !isTgtMatch) fanOut++;
    });

    // Folders connection edges
    const folderConns = universeData.connections.filter(
      (c) => c.from.toLowerCase() === id.toLowerCase() || c.to.toLowerCase() === id.toLowerCase()
    ).length;

    const totalDeps = fanIn + fanOut + folderConns;

    // Is Entry point
    const isEntryPoint = ENTRY_POINT_KEYWORDS.some((kw) => id.toLowerCase().includes(kw));

    // Centrality score (0 - 1)
    const totalRepoFiles = Math.max(1, knowledge.scan_summary.total_files);
    const centrality = Number(Math.min(1.0, (fanIn + totalDeps) / (totalRepoFiles * 0.4)).toFixed(2));

    // Complexity score
    const complexityScore = Math.round(fileCount * 2 + funcCount * 1.2 + classCount * 2.5 + symbolCount * 1.0);

    // Multi-factor Risk score (0 - 100)
    const rawRisk =
      fanIn * 5.0 +
      fanOut * 2.5 +
      centrality * 35.0 +
      (isEntryPoint ? 20.0 : 0) +
      fileCount * 1.5 +
      complexityScore * 0.2;
    const riskScore = Math.round(Math.min(100, Math.max(5, rawRisk)));

    perNodeData[id] = {
      fanIn,
      fanOut,
      totalDeps,
      fileCount,
      classCount,
      funcCount,
      symbolCount,
      centrality,
      isEntryPoint,
      complexityScore,
      riskScore,
    };

    // Assign raw score based on selected mode
    if (mode === "dependency_count") {
      rawScores[id] = totalDeps;
    } else if (mode === "complexity") {
      rawScores[id] = complexityScore;
    } else {
      rawScores[id] = riskScore;
    }
  });

  // Calculate score range across all non-root nodes for normalization
  const nonRootScores = universeData.nodes.map((n) => rawScores[n.id] ?? 0);
  const minScore = Math.min(...nonRootScores, 0);
  const maxScore = Math.max(...nonRootScores, 1);
  const range = Math.max(1, maxScore - minScore);

  targetNodeIds.forEach((id) => {
    const raw = rawScores[id] ?? 0;
    const data = perNodeData[id];
    const label = id === "root" ? universeData.root.label : id;

    // Normalized score in 0.0 - 1.0
    const normalizedScore = Number(Math.min(1.0, Math.max(0.0, (raw - minScore) / range)).toFixed(3));
    const heatColor = interpolateColor(normalizedScore);

    let criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (normalizedScore > 0.75) criticality = "CRITICAL";
    else if (normalizedScore > 0.5) criticality = "HIGH";
    else if (normalizedScore > 0.25) criticality = "MEDIUM";

    nodeMetrics[id] = {
      nodeId: id,
      label,
      rawScore: raw,
      normalizedScore,
      color: heatColor,
      glowColor: `${heatColor}80`,
      scale: Number((1.0 + normalizedScore * 0.12).toFixed(2)),
      fanIn: data.fanIn,
      fanOut: data.fanOut,
      totalDependencies: data.totalDeps,
      fileCount: data.fileCount,
      classCount: data.classCount,
      functionCount: data.funcCount,
      symbolCount: data.symbolCount,
      centrality: data.centrality,
      isEntryPoint: data.isEntryPoint,
      criticality,
    };
  });

  // Summary statistics
  const nonRootEntries = universeData.nodes
    .map((n) => ({ id: n.id, label: n.label, data: perNodeData[n.id], metrics: nodeMetrics[n.id] }))
    .filter(Boolean);

  const highestRiskNode = [...nonRootEntries].sort((a, b) => b.data.riskScore - a.data.riskScore)[0];
  const highestComplexityNode = [...nonRootEntries].sort((a, b) => b.data.complexityScore - a.data.complexityScore)[0];
  const totalScoreSum = nonRootEntries.reduce((acc, curr) => acc + curr.metrics.rawScore, 0);

  return {
    mode,
    nodeMetrics,
    summaryStats: {
      highestRiskNode: highestRiskNode ? { label: highestRiskNode.label, score: highestRiskNode.data.riskScore } : null,
      highestComplexityNode: highestComplexityNode
        ? { label: highestComplexityNode.label, score: highestComplexityNode.data.complexityScore }
        : null,
      averageScore: nonRootEntries.length > 0 ? Math.round(totalScoreSum / nonRootEntries.length) : 0,
      maxScore: Math.round(maxScore),
      totalEvaluatedNodes: nonRootEntries.length,
    },
  };
}
