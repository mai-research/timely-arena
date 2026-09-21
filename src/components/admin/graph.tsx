"use client";
import { useDarkMode } from "@/components/arena/theme-toggle";
import { canvasPalette } from "@/lib/canvas-palette";
import { useEffect, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { AKI_GRAPH, NODE_MAP } from "@/lib/admin/data";
import { explorationSubgraph } from "@/lib/admin/exploration-graph";
import { Button } from "@/components/ui/button";
export type NodeStyle = { color: string; label: string; active?: boolean };
export function ResearchGraph({
  styles,
  selected,
  onSelect,
  visitedEdges = new Set<string>(),
  extra,
  unknown = false,
}: {
  styles: Map<string, NodeStyle>;
  selected?: string;
  onSelect: (id: string) => void;
  visitedEdges?: Set<string>;
  extra?: React.ReactNode;
  unknown?: boolean;
}) {
  "use no memo"; // The graph library mutates its isolated node/link objects.
  useDarkMode();
  const palette = canvasPalette();
  const nodeColor = (color?: string) => {
    const token = color === "#2563eb" ? "graph-new" : color === "#8b5cf6" ? "graph-repeat" : color === "#c4a768" ? "graph-returned" : "graph-previous";
    return palette[token];
  };
  const [query, setQuery] = useState(""),
    [type, setType] = useState("all"),
    [showReturned, setShowReturned] = useState(false),
    [width, setWidth] = useState(400);
  const container = useRef<HTMLDivElement>(null);
  const graph = useRef<ForceGraphMethods>(undefined);
  const visited = AKI_GRAPH.nodes.filter((n) => styles.get(n.id)?.active);
  const candidates = AKI_GRAPH.nodes.filter(
    (n) =>
      styles.has(n.id) &&
      (styles.get(n.id)?.active || showReturned || n.id === selected),
  );
  const types = [...new Set(candidates.map((n) => n.type))].sort();
  const visible = candidates.filter(
    (n) =>
      (type === "all" || n.type === type) &&
      (!query ||
        `${n.id} ${n.name}`.toLowerCase().includes(query.toLowerCase())),
  );
  // Detached copies let force-graph resolve link endpoints without mutating history.
  const data = explorationSubgraph(visible.map(node => node.id), visitedEdges);
  const selectedNode =
    selected && styles.has(selected) ? NODE_MAP.get(selected) : undefined;
  const relations = selectedNode
    ? AKI_GRAPH.edges.filter(
        (e) => e.source === selectedNode.id || e.target === selectedNode.id,
      )
    : [];
  const fit = () => graph.current?.zoomToFit(0, 48);
  const choose = (id: string) => {
    if (!styles.has(id)) return;
    onSelect(id);
  };
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => graph.current?.zoomToFit(0, 48));
    return () => cancelAnimationFrame(frame);
  }, [data, width]);
  return (
    <section className="research-graph" aria-label="Battle exploration graph">
      <div className="graph-controls">
        <input
          aria-label="Search visited nodes"
          placeholder="Find an explored node…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Node type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All explored types</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <Button variant="tertiary" size="compact" onClick={fit}>
          Fit view
        </Button>
        <Button
          variant="ghost"
          size="compact"
          aria-label="Zoom out"
          onClick={() =>
            graph.current?.zoom((graph.current.zoom() || 1) / 1.3, 0)
          }
        >
          −
        </Button>
        <Button
          variant="ghost"
          size="compact"
          aria-label="Zoom in"
          onClick={() =>
            graph.current?.zoom((graph.current.zoom() || 1) * 1.3, 0)
          }
        >
          +
        </Button>
      </div>
      <label className="returned-toggle">
        <input
          type="checkbox"
          checked={showReturned}
          onChange={(e) => setShowReturned(e.target.checked)}
        />{" "}
        Include tool-returned candidates
      </label>
      <p className="muted">
        {unknown
          ? "Graph trace unavailable"
          : `${visited.length} explored nodes · ${data.nodes.length} shown through the selected step`}
        . Full coverage denominator: {AKI_GRAPH.nodes.length}. Unseen and future nodes are excluded.
      </p>
      <div
        className="battle-force-graph"
        ref={container}
        role="img"
        aria-label={`Exploration graph showing ${data.nodes.length} recorded nodes; keyboard node list below`}
      >
        {data.nodes.length > 0 ? (
          <ForceGraph2D
            ref={graph}
            graphData={data}
            width={width}
            height={320}
            backgroundColor={palette["graph-background"]}
            cooldownTicks={0}
            enableNodeDrag={false}
            autoPauseRedraw={true}
            minZoom={0.05}
            maxZoom={3}
            onEngineStop={fit}
            nodeLabel="name"
            nodeColor={(n) =>
              n.id === selected
                ? palette["graph-new"]
                : nodeColor(styles.get(String(n.id))?.color)
            }
            nodeCanvasObject={(n, ctx, scale) => {
              const x = n.x || 0,
                y = n.y || 0;
              ctx.fillStyle =
                n.id === selected
                  ? palette["graph-new"]
                  : nodeColor(styles.get(String(n.id))?.color);
              ctx.beginPath();
              ctx.arc(x, y, 5 / scale, 0, Math.PI * 2);
              ctx.fill();
              ctx.font = `${11 / scale}px sans-serif`;
              ctx.textAlign = "center";
              ctx.fillStyle = palette["text-secondary"];
              const labelOffset = data.nodes.findIndex(node => node.id === n.id) % 2 ? -12 : 19;
              ctx.fillText(String(n.name), x, y + labelOffset / scale);
            }}
            nodePointerAreaPaint={(n, color, ctx, scale) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(n.x || 0, n.y || 0, 10 / scale, 0, Math.PI * 2);
              ctx.fill();
            }}
            linkLabel="relation"
            linkColor={(l) => (l.traversed ? palette["graph-traversed"] : palette["graph-edge"])}
            linkWidth={(l) => (l.traversed ? 1.6 : 1)}
            linkLineDash={(l) => (l.traversed ? null : [4, 3])}
            linkCurvature="curvature"
            linkDirectionalArrowLength={3}
            onNodeClick={(n) => onSelect(String(n.id))}
          />
        ) : (
          <p className="graph-empty">
            {unknown
              ? "No graph trace recorded."
              : styles.size
                ? "No matching explored nodes."
                : "No nodes explored by this step."}
          </p>
        )}
      </div>
      <div className="graph-under">
        <details className="node-browser" open>
          <summary>Visible nodes · {visible.length}</summary>
          <div className="node-browser-scroll">
            {visible.map((n) => (
              <button
                key={n.id}
                aria-pressed={selected === n.id}
                onClick={() => choose(n.id)}
              >
                <i style={{ background: nodeColor(styles.get(n.id)?.color) }} />
                <span>
                  {n.name}
                  <small>
                    {n.id} · {n.type}
                  </small>
                </span>
                <small>
                  {styles.get(n.id)?.label ||
                    (unknown ? "N/A · no trace" : "Unexplored")}
                </small>
              </button>
            ))}
            {!visible.length && (
              <button
                onClick={() => {
                  setQuery("");
                  setType("all");
                }}
              >
                No nodes found · Clear filters
              </button>
            )}
          </div>
        </details>
        <div className="node-detail">
          {selectedNode ? (
            <>
              <h3>{selectedNode.name}</h3>
              <p className="muted">
                {selectedNode.id} · {selectedNode.type} ·{" "}
                {styles.get(selectedNode.id)?.label ||
                  (unknown ? "N/A · no trace" : "Unexplored")}
              </p>
              {extra}
              <details>
                <summary>Relations & evidence · {relations.length}</summary>
                <div className="relation-scroll">
                  {relations.map((e) => (
                    <article key={e.id}>
                      <p>
                        <button
                          disabled={!styles.has(e.source)}
                          onClick={() => choose(e.source)}
                        >
                          {NODE_MAP.get(e.source)?.name}
                        </button>{" "}
                        → <b>{e.relation}</b> →{" "}
                        <button
                          disabled={!styles.has(e.target)}
                          onClick={() => choose(e.target)}
                        >
                          {NODE_MAP.get(e.target)?.name}
                        </button>
                      </p>
                      <small>
                        {e.id} · {e.source_id}
                      </small>
                      <p>{e.evidence}</p>
                      <pre>{JSON.stringify(e.qualifiers, null, 2)}</pre>
                      <p className="muted">
                        {AKI_GRAPH.sources.find((s) => s.id === e.source_id)
                          ?.title || "Source not recorded"}
                      </p>
                    </article>
                  ))}
                </div>
              </details>
            </>
          ) : (
            <p className="muted">
              Select a node to inspect exploration, relations and source
              evidence.
            </p>
          )}
        </div>
      </div>
      <details className="snapshot-info">
        <summary>Snapshot provenance</summary>
        <p>Synthetic graph · SHA-256 {AKI_GRAPH.sourceHash}</p>
        <p>
          Original graph retained, including parallel relations and qualifiers.
          Draft report has not been signed off. Battle traces are independently
          authored examples.
        </p>
        {AKI_GRAPH.sources.map((s) => (
          <p key={s.id}>
            {s.id} · {s.title} · {s.source_kind}
          </p>
        ))}
      </details>
    </section>
  );
}
