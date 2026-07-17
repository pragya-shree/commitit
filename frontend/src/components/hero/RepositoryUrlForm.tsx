import { useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, GitBranch } from "lucide-react";
import { AnimatedInput, GradientButton } from "@/components/ui";

/**
 * RepositoryUrlForm — the GitHub URL input + "Analyze Repository" button.
 * Its own responsibility is just validating the URL shape; once a
 * plausible GitHub URL is submitted, it hands off to `onAnalyze` rather
 * than running its own loading/success cycle — that experience now lives
 * in AnalysisOverlay, which is a much richer "analysis in progress" view
 * than a button spinner could be. Still no backend integration or real
 * GitHub API call.
 */

type FormStatus = "idle" | "error";

const GITHUB_URL_PATTERN = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/i;

interface RepositoryUrlFormProps {
  /** Called with the trimmed URL once it passes validation. */
  onAnalyze?: (url: string) => void;
}

export function RepositoryUrlForm({ onAnalyze }: RepositoryUrlFormProps) {
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

  const helperText = status === "error" ? "Enter a valid GitHub repository URL, e.g. https://github.com/vercel/next.js" : undefined;

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
          state={status === "error" ? "error" : "default"}
          helperText={helperText}
          aria-label="GitHub repository URL"
        />
      </div>

      <GradientButton type="submit" size="lg" rightIcon={ArrowRight} className="shrink-0">
        Analyze Repository
      </GradientButton>
    </form>
  );
}
