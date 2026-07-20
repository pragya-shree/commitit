import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/api";

/**
 * useApiRequest — a generic async-request hook shared by every screen
 * that talks to the backend, so loading/error/retry/cancellation logic
 * is written once instead of five times.
 *
 * `requestFn` receives an `AbortSignal` and must pass it straight
 * through to the underlying `apiClient` call. The hook creates a fresh
 * `AbortController` for every request, aborts the previous one if a new
 * request starts (or the component unmounts) before it finishes, and
 * ignores `ApiError`s where `isAbort` is true — a cancelled request
 * should never surface as a user-visible error.
 *
 * Pass `enabled: false` to skip firing the request at all (e.g. no
 * repositoryId yet) — useful for effects that depend on data that may
 * not exist yet, without needing a separate conditional at every call site.
 */

interface UseApiRequestOptions {
  enabled?: boolean;
}

interface UseApiRequestResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-runs the same request. Safe to call after an error or at any time. */
  retry: () => void;
}

export function useApiRequest<T>(
  requestFn: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  { enabled = true }: UseApiRequestOptions = {},
): UseApiRequestResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const requestFnRef = useRef(requestFn);
  requestFnRef.current = requestFn;

  const retry = useCallback(() => setRetryToken((token) => token + 1), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is caller-supplied and intentionally drives when this re-runs, like a manual dependency array.
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    requestFnRef
      .current(controller.signal)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((caught: unknown) => {
        if (caught instanceof ApiError && caught.isAbort) return;
        const message = caught instanceof ApiError ? caught.message : "Something went wrong.";
        setError(message);
        setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, retryToken, ...deps]);

  return { data, loading, error, retry };
}