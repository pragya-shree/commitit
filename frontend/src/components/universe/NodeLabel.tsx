import { cn } from "@/utils/cn";
import type { NodeVisualState } from "./types";

/**
 * NodeLabel — the name + meta text under a node. Always visible (not a
 * hover-only tooltip) — persistent labels are both more in keeping with
 * the reference "living map" aesthetic and more accessible than
 * information that only appears on hover.
 */

interface NodeLabelProps {
  label: string;
  meta?: string;
  state: NodeVisualState;
  className?: string;
}

export function NodeLabel({ label, meta, state, className }: NodeLabelProps) {
  return (
    <div
      className={cn(
        "pointer-events-none flex flex-col items-center gap-0.5 transition-opacity duration-300",
        state === "dimmed" ? "opacity-40" : "opacity-100",
        className,
      )}
    >
      <span className={cn("font-mono text-xs font-medium transition-colors duration-300", state === "hovered" ? "text-ink" : "text-ink-dim")}>
        {label}
      </span>
      {meta && <span className="text-[10px] text-ink-faint">{meta}</span>}
    </div>
  );
}
