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

          <div className="source-stats">
            <div>
              <strong>{result.source_analysis.functions}</strong>
              <span>Functions</span>
            </div>

            <div>
              <strong>{result.source_analysis.classes}</strong>
              <span>Classes</span>
            </div>

            <div>
              <strong>{result.source_analysis.imports}</strong>
              <span>Imports</span>
            </div>

            <div>
              <strong>{result.source_analysis.endpoints}</strong>
              <span>API endpoints</span>
            </div>
          </div>

          <div className="grid">
            <div className="card">
              <h2>Technology stack</h2>

              {Object.entries(result.languages).map(
                ([language, count]) => (
                  <div className="row" key={language}>
                    <span>{language}</span>
                    <strong>{count} files</strong>
                  </div>
                )
              )}

              {result.technologies.map((technology) => (
                <div className="tag" key={technology}>
                  {technology}
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

          <div className="card">
            <h2>Source code</h2>

            <div className="source-list">
              <div>
                <span>Entry points</span>
                <strong>{result.entry_points.length}</strong>
              </div>

              <div>
                <span>Important files</span>
                <strong>{result.important_files.length}</strong>
              </div>

              <div>
                <span>Configuration files</span>
                <strong>{result.config_files.length}</strong>
              </div>

              <div>
                <span>Test files</span>
                <strong>{result.test_files.length}</strong>
              </div>
            </div>

            {result.entry_points.length > 0 && (
              <>
                <h3>Entry points</h3>

                <div className="file-list">
                  {result.entry_points.map((file) => (
                    <code key={file}>{file}</code>
                  ))}
                </div>
              </>
            )}
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