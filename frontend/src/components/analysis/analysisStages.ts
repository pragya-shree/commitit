import { Brain, FolderTree, Link2, Network, Share2, type LucideIcon } from "lucide-react";

/**
 * The mock analysis stages shown by AnalysisOverlay. Purely presentational
 * data — no timing lives here (see useAnalysisSequence), just the fixed
 * sequence of steps and how each one is labeled/iconified.
 */

export interface AnalysisStageConfig {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const ANALYSIS_STAGES: AnalysisStageConfig[] = [
  { id: "connecting", label: "Connecting to repository", icon: Link2 },
  { id: "structure", label: "Reading project structure", icon: FolderTree },
  { id: "graph", label: "Building knowledge graph", icon: Network },
  { id: "relationships", label: "Understanding relationships", icon: Share2 },
  { id: "context", label: "Preparing AI context", icon: Brain },
];
