import { AlertCircle } from "lucide-react";
import { GradientButton } from "./GradientButton";

/**
 * ErrorState — a small, consistent "the backend call failed" notice with
 * an optional retry action, reused everywhere a screen's request can
 * fail (UniversePage, DashboardPage, AIExplanationPanel's body). Pairs
 * with LoadingState — together they cover every non-happy-path a
 * useApiRequest-backed screen needs to render.
 */

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center" role="alert">
      <AlertCircle className="h-6 w-6 text-coral" aria-hidden="true" />
      <p className="max-w-sm text-sm text-ink-dim">{message}</p>
      {onRetry && (
        <GradientButton variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </GradientButton>
      )}
    </div>
  );
}