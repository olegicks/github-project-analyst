import { useState } from "react";
import DependencyGraphCard from "./components/DependencyGraph.jsx";
import { Footer, Header, ThemeToggle } from "./components/Layout.jsx";
import MarkdownContent from "./components/Markdown.jsx";
import {
  Card,
  SourceCodeCard,
  Stats,
  StructureCard,
  TechStackCard,
} from "./components/Overview.jsx";
import RepoSearch from "./components/RepoSearch.jsx";
import { analyzeRepository } from "./lib/api.js";
import { useTheme } from "./lib/theme.js";
import "./App.css";

function App() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { theme, toggleTheme } = useTheme();

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
    <div className="app">
      <Header>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </Header>

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
          <div className="results">
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

            <Card title="AI analysis" className="analysis">
              <MarkdownContent content={result.ai_analysis} />
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
