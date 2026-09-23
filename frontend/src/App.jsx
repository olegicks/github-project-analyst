import { useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!url.startsWith("https://github.com/")) {
      setError("Enter a valid GitHub repository URL.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
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

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section className="hero">
        <p>GITHUB PROJECT ANALYST</p>
        <h1>Understand any codebase.</h1>
        <span>
          AI-powered repository analysis for architecture, technologies and
          code quality.
        </span>

        <div className="search">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/username/repository"
          />

          <button onClick={analyze} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {error && <div className="error">{error}</div>}
      </section>

      {result && (
        <section className="results">
          <div className="stats">
            <div>
              <strong>{result.files}</strong>
              <span>Files</span>
            </div>

            <div>
              <strong>{result.lines_of_code.toLocaleString()}</strong>
              <span>Lines of code</span>
            </div>

            <div>
              <strong>{Object.keys(result.languages).length}</strong>
              <span>Languages</span>
            </div>

            <div>
              <strong>{result.dependencies.length}</strong>
              <span>Dependency files</span>
            </div>
          </div>

          <div className="grid">
            <div className="card">
              <h2>Technology stack</h2>

              {Object.entries(result.languages).map(([language, count]) => (
                <div className="row" key={language}>
                  <span>{language}</span>
                  <strong>{count} files</strong>
                </div>
              ))}
            </div>

            <div className="card">
              <h2>Project structure</h2>

              {result.directories.length ? (
                result.directories.map((directory) => (
                  <div className="tag" key={directory}>
                    {directory}
                  </div>
                ))
              ) : (
                <span>No directories detected.</span>
              )}
            </div>
          </div>

          <div className="card analysis">
            <h2>AI Analysis</h2>
            <pre>{result.ai_analysis}</pre>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;