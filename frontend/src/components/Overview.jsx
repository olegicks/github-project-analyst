import { Info, Metric } from "./Metric.jsx";

export function Stats({ result }) {
  return (
    <>
      <div className="stats">
        <Metric value={result.files} label="Files" />
        <Metric
          value={result.lines_of_code.toLocaleString()}
          label="Lines of code"
        />
        <Metric
          value={Object.keys(result.languages).length}
          label="Languages"
        />
        <Metric
          value={result.dependencies.length}
          label="Dependency files"
        />
      </div>

      <div className="source-stats">
        <Metric value={result.source_analysis.functions} label="Functions" />
        <Metric value={result.source_analysis.classes} label="Classes" />
        <Metric value={result.source_analysis.imports} label="Imports" />
        <Metric
          value={result.source_analysis.endpoints}
          label="API endpoints"
        />
      </div>
    </>
  );
}

export function TechStackCard({ languages, technologies }) {
  return (
    <div className="card">
      <h2>Technology stack</h2>

      {Object.entries(languages).map(([language, count]) => (
        <div className="row" key={language}>
          <span>{language}</span>
          <strong>{count} files</strong>
        </div>
      ))}

      <div className="tags">
        {technologies.map((technology) => (
          <span className="tag" key={technology}>
            {technology}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StructureCard({ directories }) {
  return (
    <div className="card">
      <h2>Project structure</h2>

      <div className="tags">
        {directories.length ? (
          directories.map((directory) => (
            <span className="tag" key={directory}>
              {directory}
            </span>
          ))
        ) : (
          <span>No directories detected.</span>
        )}
      </div>
    </div>
  );
}

export function SourceCodeCard({ result }) {
  return (
    <div className="card">
      <h2>Source code</h2>

      <div className="source-list">
        <Info label="Entry points" value={result.entry_points.length} />
        <Info label="Important files" value={result.important_files.length} />
        <Info label="Configuration files" value={result.config_files.length} />
        <Info label="Test files" value={result.test_files.length} />
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
  );
}
