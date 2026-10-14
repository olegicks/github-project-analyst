import { useCallback, useEffect, useRef, useState } from "react";
import AiAnalysisCard from "./components/AiAnalysis.jsx";
import AnalysisProgress from "./components/AnalysisProgress.jsx";
import DependencyGraphCard from "./components/DependencyGraph.jsx";
import { Footer, Header, ThemeToggle } from "./components/Layout.jsx";
import {
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
  const [pending, setPending] = useState(sharedRepository);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(null);
  const { theme, toggleTheme } = useTheme();
  const controller = useRef(null);
  const loading = Boolean(pending);

  const runAnalysis = useCallback((parsed) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;

    return analyzeRepository(parsed.url, { signal: current.signal })
      .then((data) => {
        if (current.signal.aborted) {
          return;
        }

        setRepository(parsed);
        setResult(data);
      })
      .catch((err) => {
        if (!current.signal.aborted) {
          setError(err.message);
          setFailed(parsed);
        }
      })
      .finally(() => {
        if (controller.current === current) {
          setPending(null);
        }
      });
  }, []);

  const cancel = () => {
    controller.current?.abort();
    setPending(null);
  };

  const analyze = (input) => {
    const parsed = parseRepository(input);

    setFailed(null);

    if (!parsed) {
      setError(
        "Enter a GitHub repository, e.g. https://github.com/owner/repository or owner/repository."
      );
      return;
    }

    setUrl(parsed.url);
    setPending(parsed);
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
    setFailed(null);
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
          onRetry={failed ? () => analyze(failed.url) : null}
        />

        {pending && (
          <AnalysisProgress
            key={pending.slug}
            repository={pending.slug}
            onCancel={cancel}
          />
        )}

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

            <AiAnalysisCard
              content={result.ai_analysis}
              repository={repository}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
