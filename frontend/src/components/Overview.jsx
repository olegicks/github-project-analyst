import { useState } from "react";
import { languageBreakdown } from "../lib/languages.js";
import { Metric } from "./Metric.jsx";

export function Card({ title, meta, actions, className = "", children }) {
  return (
    <section className={`card ${className}`}>
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          {meta && <p className="card-meta">{meta}</p>}
        </div>

        {actions}
      </div>

      {children}
    </section>
  );
}

export function Stats({ result }) {
  return (
    <div className="metrics">
      <Metric value={result.files.toLocaleString()} label="Files" />
      <Metric
        value={result.lines_of_code.toLocaleString()}
        label="Lines of code"
      />
      <Metric
        value={Object.keys(result.languages).length}
        label="Languages"
      />
      <Metric value={result.dependencies.length} label="Dependency files" />
      <Metric value={result.source_analysis.functions} label="Functions" />
      <Metric value={result.source_analysis.classes} label="Classes" />
      <Metric value={result.source_analysis.imports} label="Imports" />
      <Metric value={result.source_analysis.endpoints} label="API endpoints" />
    </div>
  );
}

export function TechStackCard({
  languages,
  languageLines,
  technologies,
  excludedFiles,
}) {
  const breakdown = languageBreakdown(languages, languageLines);
  const meta = [
    languageLines ? "Share by lines of code" : "Share by file count",
    excludedFiles
      ? `${excludedFiles.toLocaleString()} vendored or generated files skipped`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card title="Technology stack" meta={meta}>
      {breakdown.length > 0 && (
        <>
          <div className="language-bar" role="img" aria-label="Language breakdown">
            {breakdown.map((language) => (
              <span
                key={language.name}
                title={`${language.name} · ${language.percent.toFixed(1)}%`}
                style={{
                  width: `${language.percent}%`,
                  background: language.color,
                }}
              />
            ))}
          </div>

          <ul className="language-list">
            {breakdown.map((language) => (
              <li key={language.name}>
                <span
                  className="language-dot"
                  style={{ background: language.color }}
                />
                <span className="language-name">{language.name}</span>
                <span className="language-count">
                  {language.lines !== null && `${language.lines.toLocaleString()} lines · `}
                  {language.count} {language.count === 1 ? "file" : "files"}
                </span>
                <strong>{language.percent.toFixed(1)}%</strong>
              </li>
            ))}
          </ul>
        </>
      )}

      {technologies.length > 0 && (
        <>
          <h3 className="subheading">Detected technologies</h3>

          <div className="tags">
            {technologies.map((technology) => (
              <span className="tag" key={technology}>
                {technology}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

export function StructureCard({ directories }) {
  return (
    <Card title="Project structure" meta={`${directories.length} directories`}>
      {directories.length ? (
        <div className="tags">
          {directories.map((directory) => (
            <code className="tag tag-mono" key={directory}>
              {directory}/
            </code>
          ))}
        </div>
      ) : (
        <p className="empty">No directories detected.</p>
      )}
    </Card>
  );
}

const FILE_GROUPS = [
  { key: "entry_points", label: "Entry points" },
  { key: "important_files", label: "Important files" },
  { key: "config_files", label: "Configuration files" },
  { key: "test_files", label: "Test files" },
];

const VISIBLE_FILES = 12;

export function SourceCodeCard({ result }) {
  const [group, setGroup] = useState(
    () => FILE_GROUPS.find(({ key }) => result[key].length)?.key || null
  );
  const [expanded, setExpanded] = useState(false);

  const files = group ? result[group] : [];
  const visible = expanded ? files : files.slice(0, VISIBLE_FILES);

  const selectGroup = (key) => {
    setGroup(key);
    setExpanded(false);
  };

  return (
    <Card title="Source code">
      <div className="info-grid" role="tablist">
        {FILE_GROUPS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={group === key}
            className={`info info-tab ${group === key ? "selected" : ""}`}
            onClick={() => selectGroup(key)}
            disabled={!result[key].length}
          >
            <span>{label}</span>
            <strong>{result[key].length}</strong>
          </button>
        ))}
      </div>

      {files.length > 0 && (
        <div className="file-list" role="tabpanel">
          {visible.map((file) => (
            <code key={file}>{file}</code>
          ))}

          {files.length > VISIBLE_FILES && (
            <button
              type="button"
              className="link-button"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded
                ? "Show less"
                : `Show all ${files.length} files`}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
