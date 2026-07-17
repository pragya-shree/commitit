import { FileCode } from "lucide-react";

interface SourceFileChipProps {
  path: string;
  description?: string;
}

export function SourceFileChip({ path, description }: SourceFileChipProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <FileCode className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-mono text-xs text-ink-dim">{path}</span>
        {description && <span className="truncate text-[11px] text-ink-faint">{description}</span>}
      </div>
    </div>
  );
}
