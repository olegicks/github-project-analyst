import { useCallback, useEffect, useRef, useState } from "react";
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
import RepoHeader from "./components/RepoHeader.jsx";
import RepoSearch from "./components/RepoSearch.jsx";
import { analyzeRepository } from "./lib/api.js";
import {
  parseRepository,
  readSharedRepository,
  updateSharedRepository,
} from "./lib/repository.js";
import { useTheme } from "./lib/theme.js";
import "./App.css";

function App() {
  const [sharedRepository] = useState(readSharedRepository);
  const [url, setUrl] = useState(sharedRepository?.url || "");
  const [result, setResult] = useState(null);
  const [repository, setRepository] = useState(null);
  const [loading, setLoading] = useState(Boolean(sharedRepository));
  const [error, setError] = useState("");
  const { theme, toggleTheme } = useTheme();

  const runAnalysis = useCallback(
    (parsed) =>
      analyzeRepository(parsed.url)
        .then((data) => {
          setRepository(parsed);
          setResult(data);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    []
  );

  const analyze = (input) => {
    const parsed = parseRepository(input);

    if (!parsed) {
      setError(
        "Enter a GitHub repository, e.g. https://github.com/owner/repository or owner/repository."
      );
      return;
    }

    setUrl(parsed.url);
    setLoading(true);
    setError("");
    setResult(null);
    updateSharedRepository(parsed);
    runAnalysis(parsed);
  };

  // Analyze a repository opened from a shared ?repo= link. The ref keeps
  // StrictMode's double effect run from starting a second paid analysis.
  const sharedStarted = useRef(false);

  useEffect(() => {
    if (sharedRepository && !sharedStarted.current) {
      sharedStarted.current = true;
      runAnalysis(sharedRepository);
    }
  }, [sharedRepository, runAnalysis]);

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
          onAnalyze={() => analyze(url)}
          onSelectExample={selectExample}
          loading={loading}
          error={error}
        />

        {result && (
          <div className="results">
            <RepoHeader repository={repository} />

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
