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
  return (
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
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://github.com/username/repository"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAnalyze();
            }
          }}
        />

        <button onClick={onAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      <div className="example-repositories">
        <span className="example-title">Try one of my repositories</span>

        <div className="example-list">
          {EXAMPLE_REPOSITORIES.map((repository) => (
            <button
              className="repo-example"
              key={repository.url}
              onClick={() => onSelectExample(repository.url)}
            >
              {repository.name}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error">{error}</div>}
    </section>
  );
}
