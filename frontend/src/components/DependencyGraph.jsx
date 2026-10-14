import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildGraph, highlightGraph } from "../lib/graph.js";
import { CloseIcon } from "./Icons.jsx";
import { Info } from "./Metric.jsx";
import { Card } from "./Overview.jsx";

function FileNode({ data }) {
  return (
    <div className="file-node">
      <Handle type="target" position={Position.Left} />

      <strong title={data.file}>{data.label}</strong>

      <span title={data.file}>
        {data.directory ? `${data.directory}/ · ` : ""}
        {data.language}
      </span>

      <small>
        {data.functions} fn · {data.classes} cls · {data.imports} imports
      </small>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  file: FileNode,
};

function FileLinks({ title, files, onSelect }) {
  return (
    <div className="details-links">
      <h4>
        {title} <span>{files.length}</span>
      </h4>

      {files.length ? (
        files.map((file) => (
          <button
            key={file}
            type="button"
            className="details-link"
            onClick={() => onSelect(file)}
            title={file}
          >
            {file}
          </button>
        ))
      ) : (
        <p>None</p>
      )}
    </div>
  );
}

function FileDetails({ file, imports, importedBy, onSelect, onClose }) {
  return (
    <aside className="file-details">
      <div className="details-header">
        <h3>File details</h3>

        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close file details"
        >
          <CloseIcon />
        </button>
      </div>

      <code className="details-path">{file.file}</code>

      <span className="details-language">{file.language}</span>

      <div className="details-grid">
        <Info label="Functions" value={file.functions} />
        <Info label="Classes" value={file.classes} />
        <Info label="Imports" value={file.imports} />
      </div>

      <FileLinks title="Local imports" files={imports} onSelect={onSelect} />
      <FileLinks title="Imported by" files={importedBy} onSelect={onSelect} />
    </aside>
  );
}

export default function DependencyGraphCard({ dependencyGraph, limits }) {
  const [selectedId, setSelectedId] = useState(null);

  const graph = useMemo(
    () => buildGraph(dependencyGraph),
    [dependencyGraph]
  );

  const view = useMemo(
    () => highlightGraph(graph, selectedId),
    [graph, selectedId]
  );

  const selected = graph.nodes.find((node) => node.id === selectedId);

  return (
    <Card
      title="Dependency graph"
      className="graph-card"
      meta={`${dependencyGraph.edges.length} connections · ${dependencyGraph.connected_files.length} connected files · click a file to trace its imports`}
      actions={
        dependencyGraph.truncated && (
          <span className="badge">
            Large graph · first {limits.graph_nodes} nodes
          </span>
        )
      }
    >
      {graph.nodes.length ? (
        <div className="graph-layout">
          <div className="graph">
            <ReactFlow
              nodes={view.nodes}
              edges={view.edges}
              nodeTypes={nodeTypes}
              onNodeClick={(_event, node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId(null)}
              nodesConnectable={false}
              fitView
              minZoom={0.2}
              maxZoom={2}
            >
              <Background />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable style={{ width: 160, height: 110 }} />
            </ReactFlow>
          </div>

          {selected && (
            <FileDetails
              file={selected.data}
              imports={graph.imports.get(selected.id) || []}
              importedBy={graph.importedBy.get(selected.id) || []}
              onSelect={setSelectedId}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      ) : (
        <p className="empty">No internal dependencies detected.</p>
      )}
    </Card>
  );
}
