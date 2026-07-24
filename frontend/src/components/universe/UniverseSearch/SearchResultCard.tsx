import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Sparkles, Folder, FileCode, MapPin } from "lucide-react";
import type { SearchResult } from "./types";
import { brand } from "@/theme";

interface SearchResultCardProps {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  index: number;
}

export const SearchResultCard = React.memo(function SearchResultCard({
  result,
  onSelect,
  index,
}: SearchResultCardProps) {
  const IconComp = result.icon || (result.type === "folder" ? Folder : FileCode);
  const themeColor = result.color || brand.coral;

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(result)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="group w-full flex items-start gap-4 p-4 rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200 text-left outline-none cursor-pointer relative overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
    >
      {/* Background color subtle glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 pointer-events-none"
        style={{ backgroundColor: themeColor }}
      />

      {/* Icon Badge */}
      <div
        className="p-3 rounded-xl border shrink-0 transition-transform duration-300 group-hover:scale-105"
        style={{
          borderColor: `${themeColor}25`,
          backgroundColor: `${themeColor}0d`,
          color: themeColor,
        }}
      >
        <IconComp className="h-5 w-5" />
      </div>

      {/* Rich Card Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 truncate">
            <h4 className="font-bold text-sm text-ink font-display truncate group-hover:text-coral transition-colors duration-200">
              {result.title}
            </h4>
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0"
              style={{
                borderColor: `${themeColor}30`,
                backgroundColor: `${themeColor}12`,
                color: themeColor,
              }}
            >
              {result.type}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 animate-pulse"
              style={{
                borderColor: result.score >= 90 ? `${brand.mint}30` : `${brand.amber}30`,
                backgroundColor: result.score >= 90 ? `${brand.mint}12` : `${brand.amber}12`,
                color: result.score >= 90 ? brand.mint : brand.amber,
              }}
            >
              {result.score}% Match
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-semibold bg-void-950 px-2 py-0.5 rounded border border-white/[0.04]">
              Node: {result.targetNodeLabel}
            </span>
          </div>
        </div>

        {/* Primary Location */}
        {result.primaryLocation && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 mb-1.5">
            <MapPin className="h-3 w-3 text-coral shrink-0" />
            <span className="text-slate-400 font-semibold">Location:</span>
            <span className="truncate text-ink">{result.primaryLocation}</span>
          </div>
        )}

        {/* Relevant Files Badges */}
        {result.relevantFiles && result.relevantFiles.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono mb-2 flex-wrap">
            <FileCode className="h-3 w-3 text-mint shrink-0" />
            <span className="text-slate-500 text-[10px] font-semibold">Files:</span>
            {result.relevantFiles.slice(0, 3).map((file) => {
              const basename = file.split("/").pop() || file;
              return (
                <span
                  key={file}
                  className="px-1.5 py-0.5 rounded bg-void-950/80 text-[10px] text-mint border border-white/[0.03] truncate max-w-[140px]"
                >
                  {basename}
                </span>
              );
            })}
          </div>
        )}

        {/* Match Reason Tag */}
        <div className="flex items-center justify-between pt-1 border-t border-white/[0.03]">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <Sparkles className="h-3 w-3 text-cyan shrink-0" />
            <span className="truncate">{result.matchReason}</span>
          </div>

          <div className="flex items-center text-[10px] font-bold text-coral opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-0.5 shrink-0 ml-2">
            <span>Explore Insight</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </motion.button>
  );
});
