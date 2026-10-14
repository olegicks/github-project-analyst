const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function analyzeRepository(url) {
  const response = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Analysis failed.");
  }

  return data;
}
