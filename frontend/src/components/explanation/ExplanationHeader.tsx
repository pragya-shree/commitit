import type { RefObject } from "react";
import { X } from "lucide-react";

/**
 * ExplanationHeader — accent dot (matching the selected node's color) +
 * title + close button, pinned above the scrollable explanation content.
 */

interface ExplanationHeaderProps {
  title: string;
  accentColor: string;
  onClose: () => void;
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
}

export function ExplanationHeader({ title, accentColor, onClose, closeButtonRef }: ExplanationHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: accentColor, boxShadow: `0 0 12px ${accentColor}` }}
          aria-hidden="true"
        />
        <h2 className="truncate font-display text-lg font-semibold text-ink sm:text-xl">{title}</h2>
      </div>
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Close explanation panel"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-white/10 hover:text-ink"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
