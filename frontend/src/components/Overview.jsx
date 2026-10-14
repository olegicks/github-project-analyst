import { Info, Metric } from "./Metric.jsx";

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

export function TechStackCard({ languages, technologies }) {
  return (
    <Card title="Technology stack">
      <div className="rows">
        {Object.entries(languages).map(([language, count]) => (
          <div className="row" key={language}>
            <span>{language}</span>
            <strong>{count} files</strong>
          </div>
        ))}
      </div>

      {technologies.length > 0 && (
        <div className="tags">
          {technologies.map((technology) => (
            <span className="tag" key={technology}>
              {technology}
            </span>
          ))}
        </div>
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

export function SourceCodeCard({ result }) {
  return (
    <Card title="Source code">
      <div className="info-grid">
        <Info label="Entry points" value={result.entry_points.length} />
        <Info label="Important files" value={result.important_files.length} />
        <Info label="Configuration files" value={result.config_files.length} />
        <Info label="Test files" value={result.test_files.length} />
      </div>

      {result.entry_points.length > 0 && (
        <>
          <h3 className="subheading">Entry points</h3>

          <div className="file-list">
            {result.entry_points.map((file) => (
              <code key={file}>{file}</code>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
