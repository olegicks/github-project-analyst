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
              240,
            y:
              Math.floor(
                index / 5
              ) * 130,
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
            onKeyDown={(e) => {
              if (
                e.key === "Enter"
              ) {
                analyze();
              }
            }}
            placeholder="https://github.com/username/repository"
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

            <pre>
              {result.ai_analysis}
            </pre>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;