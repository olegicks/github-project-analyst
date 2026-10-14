const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TIMEOUT_MS = 180_000;

export async function analyzeRepository(url, { signal } = {}) {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response;

  try {
    response = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      signal: combined,
    });
  } catch (err) {
    if (signal?.aborted) {
      throw err;
    }

    if (timeout.aborted) {
      throw new Error(
        "The analysis took too long. Large repositories can exceed the time limit — try a smaller one.",
        { cause: err }
      );
    }

    throw new Error(
      "Could not reach the analysis server. It may be waking up after inactivity — try again in a minute.",
      { cause: err }
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail || `Analysis failed (HTTP ${response.status}).`
    );
  }

  return data;
}
