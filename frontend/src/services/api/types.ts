/**
 * Typed models mirroring the backend's Pydantic response/request shapes
 * (see /home/claude/work/backend/app/models/*.py). Only the fields this
 * frontend actually consumes are declared — these are hand-written to
 * match the backend today, not generated, so a backend schema change
 * requires updating this file by hand.
 */

// --- Repository ---

export interface RepositoryMetadata {
  owner: string;
  name: string;
  branch: string | null;
  files: number;
  directories: number;
  size: string;
}

export interface CloneResponse {
  success: boolean;
  repository_id: string;
  repository: RepositoryMetadata;
}

export interface TreeNode {
  name: string;
  type: "file" | "directory";
  children?: TreeNode[] | null;
}

export interface ScanSummary {
  total_files: number;
  total_directories: number;
}

export interface LargestFile {
  path: string;
  extension: string;
  size: number;
}

export interface ScanResponse {
  success: boolean;
  repository_id: string;
  summary: ScanSummary;
  languages: Record<string, number>;
  largest_files: LargestFile[];
  tree: TreeNode;
}

// --- Parser ---

export interface ParseSummary {
  total_files: number;
  total_classes: number;
  total_functions: number;
  total_imports: number;
}

export interface ParseResponse {
  success: boolean;
  repository_id: string;
  summary: ParseSummary;
}

// --- Dependency graph ---

export interface GraphNode {
  id: string;
  type: "module" | "class" | "function";
  name: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: "imports" | "inherits" | "calls";
}

export interface DependencyGraphSummary {
  total_nodes: number;
  total_edges: number;
}

export interface DependencyGraphResponse {
  success: boolean;
  repository_id: string;
  summary: DependencyGraphSummary;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// --- Knowledge Model (the unified analysis) ---

export interface HealthIndicator {
  id: string;
  label: string;
  score: number;
  status: "excellent" | "good" | "fair" | "needs-attention";
  description: string;
}

export interface TechnologyEntry {
  name: string;
  category: "language" | "framework" | "tooling" | "infrastructure";
}

export interface DiscoveryEntry {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  timestamp: string;
}

export interface KnowledgeModel {
  repository_id: string;
  version: string;
  created_at: string;
  repository: RepositoryMetadata;
  scan_summary: ScanSummary;
  languages: Record<string, number>;
  largest_files: LargestFile[];
  tree: TreeNode;
  parse_summary: ParseSummary;
  graph_summary: DependencyGraphSummary;
  nodes: GraphNode[];
  edges: GraphEdge[];
  health_indicators: HealthIndicator[];
  technologies: TechnologyEntry[];
  recent_discoveries: DiscoveryEntry[];
}

export interface KnowledgeResponse {
  success: boolean;
  knowledge: KnowledgeModel;
}

// --- Explanation Engine ---

export interface FileExplanation {
  path: string;
  explanation: string;
}

export interface ClassExplanation {
  name: string;
  module: string;
  explanation: string;
}

export interface FunctionExplanation {
  name: string;
  module: string;
  explanation: string;
}

export interface DependencyExplanation {
  symbol: string;
  explanation: string;
}

export interface ExplanationObject {
  question: string;
  repository_overview: string;
  architecture_overview: string;
  file_explanations: FileExplanation[];
  class_explanations: ClassExplanation[];
  function_explanations: FunctionExplanation[];
  dependency_explanations: DependencyExplanation[];
  summary: string;
  conversation_recap: string | null;
}

export interface ExplanationResponse {
  success: boolean;
  repository_id: string;
  explanation: ExplanationObject;
}

// --- LLM-powered AI endpoint ---

export interface AIExplainRequestBody {
  question: string;
  provider?: string | null;
  conversation_id?: string | null;
}

export interface AIExplainResponse {
  success: boolean;
  repository_id: string;
  provider: string;
  answer: string;
  fallback_used: boolean;
  conversation_id: string;
}

// --- Provider status ---

export interface ProviderStatus {
  name: string;
  configured: boolean;
  healthy: boolean;
  is_default: boolean;
}

export interface ProvidersStatusResponse {
  success: boolean;
  default_provider: string;
  providers: ProviderStatus[];
}

// --- Conversation memory ---

export interface ConversationTurn {
  question: string;
  answer: string;
  provider: string;
}

export interface ConversationResponse {
  success: boolean;
  repository_id: string;
  conversation_id: string;
  turns: ConversationTurn[];
}

// --- Error shape ---

/** The backend's uniform error body: `{"detail": "..."}` (FastAPI default, and our own global exception handler). */
export interface ApiErrorBody {
  detail?: string;
}