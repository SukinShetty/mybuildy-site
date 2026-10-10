import type { SignupPayload } from "./signup";

const SAVE_TIMEOUT_MS = 5000;

/** One download/form attempt. Never persist personal answers in browser storage. */
export function createSignupAttempt(
  answers: SignupPayload,
  callbacks: { onStored: () => void; onDownload: () => void },
  fetcher: typeof fetch = fetch,
  requestId: string = crypto.randomUUID(),
) {
  // Freeze the submitted payload: retries must describe the same attempt.
  const body = JSON.stringify(answers);
  let downloaded = false;
  let stored = false;
  let inFlight: Promise<boolean> | null = null;

  async function save(): Promise<boolean> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), SAVE_TIMEOUT_MS);
    try {
      const response = await fetcher("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body,
        keepalive: true,
        signal: abort.signal,
      });
      stored = response.status === 201;
      if (stored) callbacks.onStored();
      return stored;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
      if (!downloaded) {
        downloaded = true;
        callbacks.onDownload();
      }
    }
  }

  return {
    submit(): Promise<boolean> {
      if (stored) return Promise.resolve(true);
      inFlight ??= save().finally(() => { inFlight = null; });
      return inFlight;
    },
  };
}
