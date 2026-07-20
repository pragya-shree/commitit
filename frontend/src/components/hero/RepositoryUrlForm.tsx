import { useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, GitBranch } from "lucide-react";
import { AnimatedInput, GradientButton } from "@/components/ui";

/**
 * RepositoryUrlForm — the GitHub URL input + "Analyze Repository" button.
 * Its own responsibility is just validating the URL *shape* client-side
 * (fast feedback, no wasted network call on obviously-invalid input);
 * once that passes, it hands off to `onAnalyze` and defers to whatever
 * the caller does next. The actual clone request (POST
 * /repository/clone) is owned by Hero, not this component — Hero passes
 * `cloneLoading`/`cloneError` back down so this form can show the real
 * outcome (a failed clone, e.g. a private or nonexistent repo) using the
 * exact same error-state UI as a client-side validation failure.
 */

type FormStatus = "idle" | "error";

const GITHUB_URL_PATTERN = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/i;

interface RepositoryUrlFormProps {
  /** Called with the trimmed URL once it passes client-side validation. */
  onAnalyze?: (url: string) => void;
  /** Whether the real clone request (triggered by a previous onAnalyze) is in flight. */
  cloneLoading?: boolean;
  /** Error message from a failed real clone request, if any. */
  cloneError?: string | null;
}

export function RepositoryUrlForm({ onAnalyze, cloneLoading = false, cloneError = null }: RepositoryUrlFormProps) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setUrl(event.target.value);
    if (status !== "idle") setStatus("idle");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = url.trim();

    if (!trimmed || !GITHUB_URL_PATTERN.test(trimmed)) {
      setStatus("error");
      return;
    }

    setStatus("idle");
    onAnalyze?.(trimmed);
  }

  const validationError =
    status === "error" ? "Enter a valid GitHub repository URL, e.g. https://github.com/vercel/next.js" : null;
  const helperText = validationError ?? cloneError ?? undefined;
  const hasError = validationError !== null || cloneError !== null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <AnimatedInput
          type="url"
          inputSize="lg"
          placeholder="Paste any GitHub repository URL..."
          leadingIcon={GitBranch}
          value={url}
          onChange={handleChange}
          state={hasError ? "error" : "default"}
          helperText={helperText}
          aria-label="GitHub repository URL"
          disabled={cloneLoading}
        />
      </div>

      <GradientButton type="submit" size="lg" rightIcon={ArrowRight} loading={cloneLoading} className="shrink-0">
        Analyze Repository
      </GradientButton>
    </form>
  );
}