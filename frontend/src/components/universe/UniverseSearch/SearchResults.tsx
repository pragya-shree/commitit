import React from "react";
import { Sparkles, Clock, Search } from "lucide-react";
import type { SearchResult } from "./types";
import { SearchResultCard } from "./SearchResultCard";

interface SearchResultsProps {
  query: string;
  results: SearchResult[];
  recentSearches: string[];
  onSelectResult: (result: SearchResult) => void;
  onSelectRecent: (term: string) => void;
}

const RECOMMENDED_QUERIES = ["authentication", "database", "login", "JWT", "API", "user model"];

export const SearchResults = React.memo(function SearchResults({
  query,
  results,
  recentSearches,
  onSelectResult,
  onSelectRecent,
}: SearchResultsProps) {
  const hasQuery = query.trim().length > 0;

  if (!hasQuery) {
    return (
      <div className="flex flex-col gap-6 py-2">
        {/* Recent & Suggested Concept Pills */}
        <div className="flex flex-col gap-2.5">
          {recentSearches.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-2">
              <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-amber" />
                Recent Searches
              </span>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => onSelectRecent(term)}
                    className="px-3 py-1 rounded-xl border border-amber/20 bg-amber/5 hover:bg-amber/10 text-xs font-mono text-amber transition duration-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-cyan" />
              Suggested Concept Queries
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {RECOMMENDED_QUERIES.map((term) => (
              <button
                key={term}
                onClick={() => onSelectRecent(term)}
                className="px-3 py-1.5 rounded-xl border border-white/[0.06] bg-void-950/60 hover:bg-white/[0.05] hover:border-cyan/30 text-xs font-mono text-ink-dim hover:text-cyan transition duration-200 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="h-3 w-3 text-cyan/70" />
                <span>{term}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Empty State Banner */}
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-white/[0.03] bg-white/[0.01] text-center gap-3">
          <div className="p-3 rounded-full bg-cyan/10 border border-cyan/20 text-cyan">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-display text-ink mb-1">
              Semantic Repository Search
            </h4>
            <p className="text-xs text-slate-400 font-body leading-relaxed max-w-sm">
              Search by concept or feature (e.g. <span className="text-cyan font-mono">"authentication"</span>, <span className="text-cyan font-mono">"database"</span>) to discover structural modules and focus the universe graph.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-10 px-4 flex flex-col items-center gap-3 rounded-2xl border border-white/[0.03] bg-white/[0.005]">
        <div className="p-3 rounded-full bg-amber/10 border border-amber/20 text-amber animate-pulse">
          <Search className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-ink-dim font-display">No matching repository concepts were found</p>
          <p className="text-xs text-slate-500 font-mono mt-1 max-w-xs mx-auto leading-relaxed">
            No matches for <span className="text-coral">"{query}"</span>. Try searching for active codebase technologies (<span className="text-amber">FastAPI</span>, <span className="text-amber">React</span>, <span className="text-amber">Alembic</span>, <span className="text-amber">SQLite</span>) or focus areas (<span className="text-cyan">auth</span>, <span className="text-cyan">api</span>, <span className="text-cyan">tests</span>).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
          Concept Matches ({results.length})
        </span>
        <span className="text-[10px] text-cyan font-mono font-semibold animate-pulse">
          Click card to open Search Insight
        </span>
      </div>

      <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
        {results.map((result, index) => (
          <SearchResultCard
            key={result.id}
            result={result}
            onSelect={onSelectResult}
            index={index}
          />
        ))}
      </div>
    </div>
  );
});
