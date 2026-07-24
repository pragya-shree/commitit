import React, { useState, useMemo, useCallback } from "react";
import type { KnowledgeModel } from "@/services/api";
import type { RepositoryUniverseData } from "../types";
import type { SearchResult } from "./types";
import type { SearchInsightData } from "@/components/search/types";
import { searchRepositoryKnowledge } from "./searchEngine";
import { SearchInput } from "./SearchInput";
import { SearchResults } from "./SearchResults";

interface UniverseSearchProps {
  knowledge: KnowledgeModel | null;
  universeData: RepositoryUniverseData | null;
  onSelectResult: (insight: SearchInsightData, targetNodeId: string, highlightNodeIds: string[]) => void;
}

export const UniverseSearch = React.memo(function UniverseSearch({
  knowledge,
  universeData,
  onSelectResult,
}: UniverseSearchProps) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Memoize search computation so typing stays smooth and zero main thread latency
  const searchResults = useMemo(
    () => searchRepositoryKnowledge(query, knowledge, universeData),
    [query, knowledge, universeData]
  );

  const handleClear = useCallback(() => {
    setQuery("");
  }, []);

  const handleSelectRecent = useCallback((term: string) => {
    setQuery(term);
  }, []);

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      // Add term to recent searches list if unique
      setRecentSearches((prev) => {
        const filtered = prev.filter((t) => t.toLowerCase() !== result.title.toLowerCase());
        return [result.title, ...filtered].slice(0, 5);
      });

      // Execute callback to parent: focus graph node(s) & surface Search Insight Panel
      onSelectResult(result.insight, result.targetNodeId, result.highlightNodeIds);
    },
    [onSelectResult]
  );

  return (
    <div className="flex flex-col gap-5">
      <SearchInput
        value={query}
        onChange={setQuery}
        onClear={handleClear}
      />

      <SearchResults
        query={query}
        results={searchResults}
        recentSearches={recentSearches}
        onSelectResult={handleSelectResult}
        onSelectRecent={handleSelectRecent}
      />
    </div>
  );
});
