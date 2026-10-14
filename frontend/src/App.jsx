import { useState } from "react";
import DependencyGraphCard from "./components/DependencyGraph.jsx";
import MarkdownContent from "./components/Markdown.jsx";
import {
  SourceCodeCard,
  Stats,
  StructureCard,
  TechStackCard,
} from "./components/Overview.jsx";
import RepoSearch from "./components/RepoSearch.jsx";
import { analyzeRepository } from "./lib/api.js";
import "./App.css";

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
      setResult(await analyzeRepository(url));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectExample = (repositoryUrl) => {
    setUrl(repositoryUrl);
    setError("");
  };

  return (
    <main>
      <RepoSearch
        url={url}
        onUrlChange={setUrl}
        onAnalyze={analyze}
        onSelectExample={selectExample}
        loading={loading}
        error={error}
      />

      {result && (
        <section className="results">
          <Stats result={result} />

          <div className="grid">
            <TechStackCard
              languages={result.languages}
              technologies={result.technologies}
            />
            <StructureCard directories={result.directories} />
          </div>

          <SourceCodeCard result={result} />

          <DependencyGraphCard
            key={result.repository}
            dependencyGraph={result.dependency_graph}
            limits={result.limits}
          />

          <div className="card analysis">
            <h2>AI Analysis</h2>
            <MarkdownContent content={result.ai_analysis} />
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
