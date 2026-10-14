import { GitHubIcon } from "./Icons.jsx";

const EXAMPLE_REPOSITORIES = [
  {
    name: "restaurant-service",
    url: "https://github.com/olegicks/restaurant-service",
  },
  {
    name: "ai-appsec-reviewer",
    url: "https://github.com/olegicks/ai-appsec-reviewer",
  },
  {
    name: "car-price-predictor",
    url: "https://github.com/olegicks/car-price-predictor",
  },
  {
    name: "cloudops-dashboard",
    url: "https://github.com/olegicks/cloudops-dashboard",
  },
];

export default function RepoSearch({
  url,
  onUrlChange,
  onAnalyze,
  onSelectExample,
  loading,
  error,
}) {
  const submit = (event) => {
    event.preventDefault();
    onAnalyze();
  };

  return (
    <section className="hero">
      <span className="eyebrow">AI-powered repository analysis</span>

      <h1>
        Understand <span className="gradient-text">any codebase.</span>
      </h1>

      <p className="hero-subtitle">
        Paste a public GitHub repository to map its structure, technologies
        and dependencies, and get an AI review of architecture and code
        quality.
      </p>

      <form className="search" onSubmit={submit}>
        <label className="search-field">
          <GitHubIcon size={18} />

          <input
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://github.com/owner/repository"
            aria-label="GitHub repository URL"
            spellCheck="false"
            autoComplete="off"
          />
        </label>

        <button className="button-primary" type="submit" disabled={loading}>
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </form>

      <div className="examples">
        <span>Try:</span>

        {EXAMPLE_REPOSITORIES.map((repository) => (
          <button
            className="chip"
            type="button"
            key={repository.url}
            onClick={() => onSelectExample(repository.url)}
          >
            {repository.name}
          </button>
        ))}
      </div>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
