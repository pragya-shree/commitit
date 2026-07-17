import { Sparkles } from "lucide-react";

/**
 * EmptyExplanationState — shown if the panel is open but no explanation
 * data exists for the selected node (a defensive fallback, not a normal
 * part of the flow — every mock node currently has data).
 */

interface EmptyExplanationStateProps {
  onClose?: () => void;
}

export function EmptyExplanationState({ onClose }: EmptyExplanationStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Sparkles className="h-8 w-8 text-ink-faint" aria-hidden="true" />
      <p className="max-w-[220px] text-sm text-ink-dim">No explanation available for this node yet.</p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-ink-faint underline underline-offset-2 transition-colors hover:text-ink"
        >
          Close
        </button>
      )}
    </div>
  );
}
