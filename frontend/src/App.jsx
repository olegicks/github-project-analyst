import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

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

function FileNode({ data }) {
  return (
    <div className="file-node">
      <Handle
        type="target"
        position={Position.Left}
      />

      <strong title={data.file}>
        {data.label}
      </strong>

      <span>{data.language}</span>

      <small>
        {data.functions} fn · {data.classes} cls ·{" "}
        {data.imports} imports
      </small>

      <Handle
        type="source"
        position={Position.Right}
      />
    </div>
  );
}

const nodeTypes = {
  file: FileNode,
};

function Metric({ value, label }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function renderInlineMarkdown(text) {
  const parts = text.split(
    /(\*\*.*?\*\*|`.*?`|\*[^*]+\*)/g
  );

  return parts.map((part, index) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong key={index}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      part.startsWith("`") &&
      part.endsWith("`")
    ) {
      return (
        <code key={index}>
          {part.slice(1, -1)}
        </code>
      );
    }

    if (
      part.startsWith("*") &&
      part.endsWith("*")
    ) {
      return (
        <em key={index}>
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}

function cleanHeading(text) {
  return text.replace(
    /^\d+\.\s*/,
    ""
  );
}

function MarkdownTable({ lines }) {
  if (lines.length < 2) {
    return null;
  }

  const parseRow = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  const headers = parseRow(lines[0]);

  const rows = lines
    .slice(2)
    .map(parseRow)
    .filter((row) =>
      row.some((cell) => cell.length > 0)
    );

  return (
    <div className="markdown-table-wrapper">
      <table className="markdown-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>
                {renderInlineMarkdown(header)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map((_, cellIndex) => (
                <td key={cellIndex}>
                  {renderInlineMarkdown(
                    row[cellIndex] || ""
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarkdownContent({ content }) {
  if (!content) {
    return (
      <div className="markdown-empty">
        No AI analysis available.
      </div>
    );
  }

  const lines = content.split(/\r?\n/);
  const elements = [];

  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (
      trimmed === "---" ||
      trimmed === "\\---"
    ) {
      elements.push(
        <hr
          className="markdown-divider"
          key={elements.length}
        />
      );

      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines = [];

      index += 1;

      while (
        index < lines.length &&
        !lines[index].trim().startsWith("```")
      ) {
        codeLines.push(lines[index]);
        index += 1;
      }

      elements.push(
        <pre
          className="markdown-code"
          key={elements.length}
        >
          <code>
            {codeLines.join("\n")}
          </code>
        </pre>
      );

      index += 1;
      continue;
    }

    if (
      trimmed.startsWith("|") &&
      index + 1 < lines.length &&
      lines[index + 1]
        .trim()
        .match(/^\|?[\s|:-]+\|?$/)
    ) {
      const tableLines = [
        lines[index],
        lines[index + 1],
      ];

      index += 2;

      while (
        index < lines.length &&
        lines[index].trim().startsWith("|")
      ) {
        tableLines.push(lines[index]);
        index += 1;
      }

      elements.push(
        <MarkdownTable
          lines={tableLines}
          key={elements.length}
        />
      );

      continue;
    }

    if (trimmed.startsWith("#### ")) {
      elements.push(
        <h3
          className="markdown-h3"
          key={elements.length}
        >
          {renderInlineMarkdown(
            cleanHeading(trimmed.slice(5))
          )}
        </h3>
      );

      index += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h2
          className="markdown-main-heading"
          key={elements.length}
        >
          {renderInlineMarkdown(
            cleanHeading(trimmed.slice(4))
          )}
        </h2>
      );

      index += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2
          className="markdown-main-heading"
          key={elements.length}
        >
          {renderInlineMarkdown(
            cleanHeading(trimmed.slice(3))
          )}
        </h2>
      );

      index += 1;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(
        <h2
          className="markdown-main-heading"
          key={elements.length}
        >
          {renderInlineMarkdown(
            cleanHeading(trimmed.slice(2))
          )}
        </h2>
      );

      index += 1;
      continue;
    }

    if (
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ")
    ) {
      const items = [];

      while (
        index < lines.length &&
        (
          lines[index]
            .trim()
            .startsWith("- ") ||
          lines[index]
            .trim()
            .startsWith("* ")
        )
      ) {
        items.push(
          lines[index]
            .trim()
            .slice(2)
        );

        index += 1;
      }

      elements.push(
        <ul
          className="markdown-list"
          key={elements.length}
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );

      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items = [];

      while (
        index < lines.length &&
        /^\d+\.\s/.test(
          lines[index].trim()
        )
      ) {
        items.push(
          lines[index]
            .trim()
            .replace(/^\d+\.\s/, "")
        );

        index += 1;
      }

      elements.push(
        <ul
          className="markdown-list"
          key={elements.length}
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );

      continue;
    }

    elements.push(
      <p
        className="markdown-paragraph"
        key={elements.length}
      >
        {renderInlineMarkdown(trimmed)}
      </p>
    );

    index += 1;
  }

  return (
    <div className="markdown-content">
      {elements}
    </div>
  );
}

function App() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] =
    useState(null);

  const analyze = async () => {
    if (
      !url.startsWith(
        "https://github.com/"
      )
    ) {
      setError(
        "Enter a valid GitHub repository URL."
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSelectedFile(null);

    try {
      const response = await fetch(
        `${API_URL}/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({ url }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Analysis failed."
        );
      }

      setResult(data);
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

  const graph = useMemo(() => {
    if (!result?.dependency_graph) {
      return {
        nodes: [],
        edges: [],
      };
    }

    const connected = new Set(
      result.dependency_graph
        .connected_files
    );

    const sourceNodes =
      result.dependency_graph.nodes
        .filter((node) =>
          connected.has(node.id)
        )
        .slice(0, 120);

    const nodes =
      sourceNodes.map(
        (node, index) => ({
          id: node.id,
          type: "file",
          position: {
            x:
              (index % 5) *
              230,
            y:
              Math.floor(
                index / 5
              ) * 120,
          },
          data: {
            label: node.label,
            file: node.file,
            language:
              node.language,
            functions:
              node.functions,
            classes:
              node.classes,
            imports:
              node.imports,
          },
        })
      );

    const ids = new Set(
      nodes.map(
        (node) => node.id
      )
    );

    const edges =
      result.dependency_graph.edges
        .filter(
          (edge) =>
            ids.has(edge.source) &&
            ids.has(edge.target)
        )
        .map((edge) => ({
          ...edge,
          markerEnd: {
            type:
              MarkerType.ArrowClosed,
          },
        }));

    return {
      nodes,
      edges,
    };
  }, [result]);

  const handleNodeClick = (
    _event,
    node
  ) => {
    setSelectedFile(
      node.data
    );
  };

  return (
    <main>
      <section className="hero">
        <p>
          GITHUB PROJECT ANALYST
        </p>

        <h1>
          Understand any codebase.
        </h1>

        <span>
          AI-powered repository
          analysis for architecture,
          technologies and code quality.
        </span>

        <div className="search">
          <input
            value={url}
            onChange={(e) =>
              setUrl(e.target.value)
            }
            placeholder="https://github.com/username/repository"
            onKeyDown={(e) => {
              if (
                e.key === "Enter"
              ) {
                analyze();
              }
            }}
          />

          <button
            onClick={analyze}
            disabled={loading}
          >
            {loading
              ? "Analyzing..."
              : "Analyze"}
          </button>
        </div>

        <div className="example-repositories">
          <span className="example-title">
            Try one of my repositories
          </span>

          <div className="example-list">
            {EXAMPLE_REPOSITORIES.map(
              (repository) => (
                <button
                  className="repo-example"
                  key={repository.url}
                  onClick={() =>
                    selectExample(
                      repository.url
                    )
                  }
                >
                  {repository.name}
                </button>
              )
            )}
          </div>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}
      </section>

      {result && (
        <section className="results">
          <div className="stats">
            <Metric
              value={result.files}
              label="Files"
            />

            <Metric
              value={result.lines_of_code.toLocaleString()}
              label="Lines of code"
            />

            <Metric
              value={
                Object.keys(
                  result.languages
                ).length
              }
              label="Languages"
            />

            <Metric
              value={
                result.dependencies
                  .length
              }
              label="Dependency files"
            />
          </div>

          <div className="source-stats">
            <Metric
              value={
                result.source_analysis
                  .functions
              }
              label="Functions"
            />

            <Metric
              value={
                result.source_analysis
                  .classes
              }
              label="Classes"
            />

            <Metric
              value={
                result.source_analysis
                  .imports
              }
              label="Imports"
            />

            <Metric
              value={
                result.source_analysis
                  .endpoints
              }
              label="API endpoints"
            />
          </div>

          <div className="grid">
            <div className="card">
              <h2>
                Technology stack
              </h2>

              {Object.entries(
                result.languages
              ).map(
                ([
                  language,
                  count,
                ]) => (
                  <div
                    className="row"
                    key={language}
                  >
                    <span>
                      {language}
                    </span>

                    <strong>
                      {count} files
                    </strong>
                  </div>
                )
              )}

              <div className="tags">
                {result.technologies.map(
                  (technology) => (
                    <span
                      className="tag"
                      key={
                        technology
                      }
                    >
                      {technology}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="card">
              <h2>
                Project structure
              </h2>

              <div className="tags">
                {result.directories
                  .length ? (
                  result.directories.map(
                    (directory) => (
                      <span
                        className="tag"
                        key={
                          directory
                        }
                      >
                        {directory}
                      </span>
                    )
                  )
                ) : (
                  <span>
                    No directories
                    detected.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2>
              Source code
            </h2>

            <div className="source-list">
              <Info
                label="Entry points"
                value={
                  result.entry_points
                    .length
                }
              />

              <Info
                label="Important files"
                value={
                  result.important_files
                    .length
                }
              />

              <Info
                label="Configuration files"
                value={
                  result.config_files
                    .length
                }
              />

              <Info
                label="Test files"
                value={
                  result.test_files
                    .length
                }
              />
            </div>

            {result.entry_points
              .length > 0 && (
              <>
                <h3>
                  Entry points
                </h3>

                <div className="file-list">
                  {result.entry_points.map(
                    (file) => (
                      <code
                        key={file}
                      >
                        {file}
                      </code>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          <div className="card graph-card">
            <div className="card-header">
              <div>
                <h2>
                  Dependency graph
                </h2>

                <p>
                  {
                    result
                      .dependency_graph
                      .edges.length
                  }{" "}
                  connections ·{" "}
                  {
                    result
                      .dependency_graph
                      .connected_files
                      .length
                  }{" "}
                  connected files
                </p>
              </div>

              {result
                .dependency_graph
                .truncated && (
                <span className="graph-limit">
                  Large graph · first{" "}
                  {result.limits
                    .graph_nodes}{" "}
                  nodes
                </span>
              )}
            </div>

            {graph.nodes.length ? (
              <div className="graph-layout">
                <div className="graph">
                  <ReactFlow
                    nodes={graph.nodes}
                    edges={graph.edges}
                    nodeTypes={nodeTypes}
                    onNodeClick={
                      handleNodeClick
                    }
                    fitView
                    minZoom={0.2}
                    maxZoom={2}
                  >
                    <Background />
                    <Controls />
                    <MiniMap />
                  </ReactFlow>
                </div>

                {selectedFile && (
                  <aside className="file-details">
                    <div className="details-header">
                      <h3>
                        File details
                      </h3>

                      <button
                        className="close-button"
                        onClick={() =>
                          setSelectedFile(
                            null
                          )
                        }
                      >
                        ×
                      </button>
                    </div>

                    <strong>
                      {
                        selectedFile
                          .file
                      }
                    </strong>

                    <span>
                      {
                        selectedFile
                          .language
                      }
                    </span>

                    <div className="details-grid">
                      <Info
                        label="Functions"
                        value={
                          selectedFile
                            .functions
                        }
                      />

                      <Info
                        label="Classes"
                        value={
                          selectedFile
                            .classes
                        }
                      />

                      <Info
                        label="Imports"
                        value={
                          selectedFile
                            .imports
                        }
                      />
                    </div>
                  </aside>
                )}
              </div>
            ) : (
              <div className="empty-graph">
                No internal dependencies
                detected.
              </div>
            )}
          </div>

          <div className="card analysis">
            <h2>
              AI Analysis
            </h2>

            <MarkdownContent
              content={
                result.ai_analysis
              }
            />
          </div>
        </section>
      )}
    </main>
  );
}

export default App;