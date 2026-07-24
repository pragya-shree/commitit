import type { LucideIcon } from "lucide-react";
import type { SearchInsightData } from "@/components/search/types";

export type SearchResultType = "concept" | "folder" | "file" | "symbol";

export interface SearchResult {
  id: string;
  title: string;
  type: SearchResultType;
  targetNodeId: string;
  targetNodeLabel: string;
  highlightNodeIds: string[];
  primaryLocation: string;
  relevantFiles: string[];
  summary: string;
  matchReason: string;
  icon?: LucideIcon;
  color?: string;
  score: number;
  insight: SearchInsightData;
}
