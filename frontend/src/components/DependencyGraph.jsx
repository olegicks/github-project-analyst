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
import { buildGraph } from "../lib/graph.js";
import { Info } from "./Metric.jsx";

function FileNode({ data }) {
  return (
    <div className="file-node">
      <Handle type="target" position={Position.Left} />

      <strong title={data.file}>{data.label}</strong>

      <span>{data.language}</span>

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

function FileDetails({ file, onClose }) {
  return (
    <aside className="file-details">
      <div className="details-header">
        <h3>File details</h3>

        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>

      <strong>{file.file}</strong>

      <span>{file.language}</span>

      <div className="details-grid">
        <Info label="Functions" value={file.functions} />
        <Info label="Classes" value={file.classes} />
        <Info label="Imports" value={file.imports} />
      </div>
    </aside>
  );
}

export default function DependencyGraphCard({ dependencyGraph, limits }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const graph = useMemo(
    () => buildGraph(dependencyGraph),
    [dependencyGraph]
  );

  return (
    <div className="card graph-card">
      <div className="card-header">
        <div>
          <h2>Dependency graph</h2>

          <p>
            {dependencyGraph.edges.length} connections ·{" "}
            {dependencyGraph.connected_files.length} connected files
          </p>
        </div>

        {dependencyGraph.truncated && (
          <span className="graph-limit">
            Large graph · first {limits.graph_nodes} nodes
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
              onNodeClick={(_event, node) => setSelectedFile(node.data)}
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
            <FileDetails
              file={selectedFile}
              onClose={() => setSelectedFile(null)}
            />
          )}
        </div>
      ) : (
        <div className="empty-graph">No internal dependencies detected.</div>
      )}
    </div>
  );
}
