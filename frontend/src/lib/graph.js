import { MarkerType } from "@xyflow/react";

const MAX_RENDERED_NODES = 120;

export function buildGraph(dependencyGraph) {
  if (!dependencyGraph) {
    return { nodes: [], edges: [] };
  }

  const connected = new Set(dependencyGraph.connected_files);

  const sourceNodes = dependencyGraph.nodes
    .filter((node) => connected.has(node.id))
    .slice(0, MAX_RENDERED_NODES);

  const nodes = sourceNodes.map((node, index) => ({
    id: node.id,
    type: "file",
    position: {
      x: (index % 5) * 230,
      y: Math.floor(index / 5) * 120,
    },
    data: {
      label: node.label,
      file: node.file,
      language: node.language,
      functions: node.functions,
      classes: node.classes,
      imports: node.imports,
    },
  }));

  const ids = new Set(nodes.map((node) => node.id));

  const edges = dependencyGraph.edges
    .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    .map((edge) => ({
      ...edge,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    }));

  return { nodes, edges };
}
