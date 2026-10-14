// Colors follow GitHub Linguist so the breakdown looks familiar.
const LANGUAGE_COLORS = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  PHP: "#4F5D95",
  Ruby: "#701516",
  HTML: "#e34c26",
  CSS: "#663399",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Markdown: "#083fa1",
  JSON: "#292929",
  YAML: "#cb171e",
  TOML: "#9c4221",
  Dockerfile: "#384d54",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Dart: "#00B4AB",
  Vue: "#41b883",
  SQL: "#e38c00",
};

const FALLBACK_COLOR = "#8b93a7";

export function languageBreakdown(languages) {
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;

  return entries.map(([name, count]) => ({
    name,
    count,
    percent: (count / total) * 100,
    color: LANGUAGE_COLORS[name] || FALLBACK_COLOR,
  }));
}
