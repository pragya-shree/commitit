export interface RelevantFileItem {
  path: string;
  explanation?: string;
}

export interface RelevantSymbolItem {
  name: string;
  type: "module" | "class" | "function";
  id: string;
}

export interface SearchInsightData {
  query: string;
  title: string;
  matchReason: string;
  primaryLocation: string;
  relevantFolders: string[];
  relevantFiles: RelevantFileItem[];
  relevantSymbols: RelevantSymbolItem[];
  technologiesDetected: string[];
  repositorySummary: string;
  accentColor?: string;
}
