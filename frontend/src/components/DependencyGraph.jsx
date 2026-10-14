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
import { CloseIcon } from "./Icons.jsx";
import { Info } from "./Metric.jsx";
import { Card } from "./Overview.jsx";

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
    <Card
      title="Dependency graph"
      className="graph-card"
      meta={`${dependencyGraph.edges.length} connections · ${dependencyGraph.connected_files.length} connected files`}
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
        <p className="empty">No internal dependencies detected.</p>
      )}
    </Card>
  );
}
