import { AKI_GRAPH } from "./data";

// Always clone graph objects: force-graph resolves link endpoints in place.
export function explorationSubgraph(
  ids: Iterable<string>,
  traversed: ReadonlySet<string>,
) {
  const selected = new Set(ids);
  const nodes = AKI_GRAPH.nodes
    .filter((n) => selected.has(n.id))
    .map((n) => {
      const p = (
        AKI_GRAPH.positions as Record<string, { x: number; y: number }>
      )[n.id];
      return {
        id: n.id,
        name: n.name,
        type: n.type,
        x: p.x,
        y: p.y,
        fx: p.x,
        fy: p.y,
      };
    });
  const pairs = new Map<string, number>();
  const links = AKI_GRAPH.edges
    .filter((e) => selected.has(e.source) && selected.has(e.target))
    .map((e) => {
      const key = [e.source, e.target].sort().join(":");
      const index = pairs.get(key) || 0;
      pairs.set(key, index + 1);
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        relation: e.relation,
        traversed: traversed.has(e.id),
        curvature:
          index === 0 ? 0 : Math.ceil(index / 2) * 0.12 * (index % 2 ? 1 : -1),
      };
    });
  return { nodes, links };
}
