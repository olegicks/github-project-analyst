import { MarkerType } from "@xyflow/react";

const MAX_RENDERED_NODES = 120;
const COLUMN_WIDTH = 270;
const ROW_HEIGHT = 96;

// Matches .file-node; React Flow needs sizes up front for the minimap
// because this graph is not wired to onNodesChange measurements.
const NODE_WIDTH = 200;
const NODE_HEIGHT = 82;

// Places each file one column to the right of the deepest file importing it,
// so imports read left to right. Cycles are cut off after nodes.length passes.
function assignLayers(ids, edges) {
  const layer = new Map(ids.map((id) => [id, 0]));

  for (let pass = 0; pass < ids.length; pass += 1) {
    let changed = false;

    for (const edge of edges) {
      const next = layer.get(edge.source) + 1;

      if (next > layer.get(edge.target) && next < ids.length) {
        layer.set(edge.target, next);
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return layer;
}

export function buildGraph(dependencyGraph) {
  if (!dependencyGraph) {
    return { nodes: [], edges: [], imports: new Map(), importedBy: new Map() };
  }

  const connected = new Set(dependencyGraph.connected_files);

  const sourceNodes = dependencyGraph.nodes
    .filter((node) => connected.has(node.id))
    .slice(0, MAX_RENDERED_NODES);

  const ids = new Set(sourceNodes.map((node) => node.id));

  const sourceEdges = dependencyGraph.edges.filter(
    (edge) => ids.has(edge.source) && ids.has(edge.target)
  );

  const layers = assignLayers([...ids], sourceEdges);
  const columns = new Map();

  for (const node of sourceNodes) {
    const column = layers.get(node.id);
    columns.set(column, [...(columns.get(column) || []), node]);
  }

  const tallest = Math.max(...[...columns.values()].map((c) => c.length));

  const nodes = [...columns.entries()].flatMap(([column, members]) => {
    const offset = ((tallest - members.length) * ROW_HEIGHT) / 2;

    return members
      .sort((a, b) => a.file.localeCompare(b.file))
      .map((node, row) => ({
        id: node.id,
        type: "file",
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        position: {
          x: column * COLUMN_WIDTH,
          y: offset + row * ROW_HEIGHT,
        },
        data: {
          label: node.label,
          file: node.file,
          directory: node.file.split("/").slice(0, -1).join("/"),
          language: node.language,
          functions: node.functions,
          classes: node.classes,
          imports: node.imports,
        },
      }));
  });

  const imports = new Map();
  const importedBy = new Map();

  for (const edge of sourceEdges) {
    imports.set(edge.source, [...(imports.get(edge.source) || []), edge.target]);
    importedBy.set(edge.target, [
      ...(importedBy.get(edge.target) || []),
      edge.source,
    ]);
  }

  const edges = sourceEdges.map((edge) => ({
    ...edge,
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  }));

  return { nodes, edges, imports, importedBy };
}

export function highlightGraph(graph, selectedId) {
  if (!selectedId) {
    return graph;
  }

  const related = new Set([
    selectedId,
    ...(graph.imports.get(selectedId) || []),
    ...(graph.importedBy.get(selectedId) || []),
  ]);

  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      selected: node.id === selectedId,
      className: related.has(node.id) ? "" : "dimmed",
    })),
    edges: graph.edges.map((edge) => {
      const active = edge.source === selectedId || edge.target === selectedId;

      return {
        ...edge,
        animated: active,
        className: active ? "highlighted" : "dimmed",
      };
    }),
  };
}
