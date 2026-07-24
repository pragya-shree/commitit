import React from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export const SearchInput = React.memo(function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search concepts, features, files or architecture...",
}: SearchInputProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-white/[0.08] bg-void-950/70 focus:border-cyan text-sm text-ink outline-none transition duration-200 placeholder:text-slate-500 font-body shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-ink transition duration-150 cursor-pointer"
          title="Clear search input"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});
