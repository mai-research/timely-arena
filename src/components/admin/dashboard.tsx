"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  AKI_GRAPH,
  ADMIN_RECORDS,
  METHOD_NAMES,
  MODELS,
  NODE_MAP,
  PREFIXES,
  available,
  cohort,
  coverage,
  metrics,
  recordRuns,
  selectRecords,
  timeline,
  type AdminRecord,
  type Filters,
  type TraceStep,
} from "@/lib/admin/data";
import dynamic from "next/dynamic";
import type { NodeStyle } from "./graph";
import { Button } from "@/components/ui/button";
const ResearchGraph = dynamic(
  () => import("./graph").then((m) => m.ResearchGraph),
  {
    ssr: false,
    loading: () => <p className="muted">Loading exploration graph…</p>,
  },
);
import { Answer } from "@/components/arena/answer";
import { ExecutionMessages, ToolMessages } from "./execution-messages";
import { Message, MessageBubble, MessageBubbleContent } from "@/components/agentui/message";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
function Heading({ title }: { title: string }) {
  return (
    <header className="admin-heading">
      <div>
        <h1>{title}</h1>
        <span className="admin-demo-badge">Admin demo</span>
      </div>
      <p className="admin-demo-note">
        Research workspace · Fixed synthetic battles, authored execution
        summaries and tool events. Synthetic demonstration graph · not clinical evidence.
      </p>
    </header>
  );
}
function useFilters() {
  const params = useSearchParams();
  const f = Object.fromEntries(params.entries()) as Filters;
  const set = (changes: Record<string, string>) => {
    const p = new URLSearchParams(window.location.search);
    Object.entries(changes).forEach(([k, v]) =>
      v ? p.set(k, v) : p.delete(k),
    );
    if (!("page" in changes)) p.delete("page");
    window.history.replaceState(null, "", `?${p.toString()}`);
  };
  return { f, set, query: params.toString() };
}
const formatCoverage = (c: ReturnType<typeof coverage>) =>
  c ? `${c.visited} / ${c.total} · ${c.percent.toFixed(1)}%` : "N/A";
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options: string[][];
}) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function AdminHistory() {
  const { f, set, query } = useFilters();
  const batch = f.batch || "AKI pilot A";
  const effective = { ...f, batch };
  const records = selectRecords(effective);
  const groups = MODELS.flatMap((model) =>
    ["graph", "llm"].map((method) => [
      `${model}|${method}`,
      `${model} · ${METHOD_NAMES[method as "graph" | "llm"]}`,
    ]),
  );
  const keyA = f.groupA || `${MODELS[0]}|graph`,
    keyB = f.groupB || `${MODELS[1]}|graph`;
  const a = cohort(records, keyA, effective),
    b = cohort(records, keyB, effective);
  const view = f.view || "exploration";
  const page = Math.max(
    1,
    Math.min(Math.ceil(records.length / 25) || 1, Number(f.page) || 1),
  );
  const sort = (key: string) =>
    set({
      sort: key,
      direction: f.sort === key && f.direction !== "asc" ? "asc" : "desc",
    });
  return (
    <>
      <Heading title="Research analysis" />
      <nav className="research-view-switch" aria-label="Admin views">
        <Button
          variant={view === "exploration" ? "primary" : "ghost"}
          active={view === "exploration"}
          aria-current={view === "exploration" ? "page" : undefined}
          onClick={() => set({ view: "exploration" })}
        >
          Exploration
        </Button>
        <Button
          variant={view === "battles" ? "primary" : "ghost"}
          active={view === "battles"}
          aria-current={view === "battles" ? "page" : undefined}
          onClick={() => set({ view: "battles" })}
        >
          Battles <span className="view-count">{records.length}</span>
        </Button>
      </nav>
      <div className="research-filters">
        <Filter
          label="Experiment"
          value={batch}
          onChange={(v) => set({ batch: v })}
          options={[...new Set(ADMIN_RECORDS.map((r) => r.experiment))].map(
            (s) => [s, s],
          )}
        />
        <Filter
          label="Model"
          value={f.model || "all"}
          onChange={(v) => set({ model: v })}
          options={[["all", "All models"], ...MODELS.map((s) => [s, s])]}
        />
        <Filter
          label="Method"
          value={f.method || "all"}
          onChange={(v) => set({ method: v })}
          options={[["all", "All methods"], ...Object.entries(METHOD_NAMES)]}
        />
        <Filter
          label="Execution"
          value={f.status || "all"}
          onChange={(v) => set({ status: v })}
          options={["all", "completed", "failed", "interrupted"].map((s) => [
            s,
            s,
          ])}
        />
        <Filter
          label="Outcome"
          value={f.outcome || "all"}
          onChange={(v) => set({ outcome: v })}
          options={[
            ["all", "All results"],
            ["A", "A wins"],
            ["B", "B wins"],
            ["tie", "Tie"],
            ["unrated", "Unrated"],
          ]}
        />
        <button
          className="text-button"
          onClick={() =>
            set({
              q: "",
              model: "",
              method: "",
              status: "",
              outcome: "",
              node: "",
              visit: "",
            })
          }
        >
          Clear filters
        </button>
      </div>
      <p className="muted">
        {records.length} battles · Prompt set aki-case-v1 · Graph{" "}
        {AKI_GRAPH.sourceHash.slice(0, 12)} · Single pass = one user request,
        with any number of agent steps.
      </p>
      {f.node && (
        <div className="active-filter">
          {f.visit === "not" ? "Not explored" : "Explored"}:{" "}
          {NODE_MAP.get(f.node)?.name || f.node}{" "}
          <button onClick={() => set({ node: "", visit: "" })}>
            × Clear node filter
          </button>
        </div>
      )}
      {view === "exploration" ? (
        <>
          <div className="cohort-grid">
            {[
              { c: a, k: keyA, label: "Group A", field: "groupA" },
              { c: b, k: keyB, label: "Group B", field: "groupB" },
            ].map(({ c, k, label, field }) => (
              <section className="cohort" key={field}>
                <Filter
                  label={label}
                  value={k}
                  onChange={(v) => set({ [field]: v })}
                  options={groups.filter(([id]) =>
                    id === (field === "groupA" ? keyB : keyA) ? id === k : true,
                  )}
                />
                <div className="cohort-metrics">
                  <div>
                    <strong>{c.executions}</strong>
                    <span>Executions / {c.candidates} candidates</span>
                  </div>
                  <div>
                    <strong>
                      {c.wins} / {c.losses} / {c.ties}
                    </strong>
                    <span>Win / loss / tie · {c.unrated} unrated</span>
                  </div>
                  <div>
                    <strong>{formatCoverage(c.coverage)}</strong>
                    <span>Active coverage · {c.available} usable traces</span>
                  </div>
                  <div>
                    <strong>
                      {c.medianSteps ?? "N/A"} / {c.medianTools ?? "N/A"}
                    </strong>
                    <span>Median steps / tool calls</span>
                  </div>
                </div>
                <p className="muted">
                  {c.available ? c.returned.size : "N/A"} distinct tool-returned
                  nodes, counted separately.
                </p>
              </section>
            ))}
          </div>
          <div className="analysis-battle-entry">
            <p className="muted">
              Open a battle to inspect its visited nodes and follow exploration
              across conversation turns and agent steps.
            </p>
            <Button
              className="shrink-0 whitespace-nowrap"
              variant="tertiary"
              onClick={() => set({ view: "battles" })}
            >
              View battles →
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="admin-toolbar">
            <input
              className="battle-search"
              aria-label="Search battles"
              placeholder="Search name, prompt or battle ID…"
              value={f.q || ""}
              onChange={(e) => set({ q: e.target.value })}
            />
            <span className="muted">
              {ADMIN_RECORDS.filter((r) => r.rounds.length === 1).length}{" "}
              single-pass ·{" "}
              {ADMIN_RECORDS.filter((r) => r.rounds.length > 1).length}{" "}
              multi-turn example
            </span>
          </div>
          <div className="admin-history-table">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    ["title", "Battle"],
                    ["updatedAt", "Updated"],
                    ["turns", "Turns"],
                    ["steps", "Steps"],
                    ["tools", "Tool calls"],
                    ["coverage", "Active coverage"],
                  ].map(([key, label]) => (
                    <TableHead
                      key={key}
                      aria-sort={
                        (f.sort || "updatedAt") === key
                          ? f.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button onClick={() => sort(key)}>
                        {label}{" "}
                        {(f.sort || "updatedAt") === key
                          ? f.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.slice((page - 1) * 25, page * 25).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        className="admin-run-link"
                        href={`/admin/runs/${r.id}?${query || "batch=AKI+pilot+A&view=battles"}`}
                      >
                        <div>
                          {r.title}
                          <small>
                            {r.rounds[0].runs
                              .map(
                                (run) =>
                                  `${run.model} · ${METHOD_NAMES[run.method]}`,
                              )
                              .join(" vs ")}
                            <small>
                              {r.id} ·{" "}
                              <span className={`run-status ${r.status}`}>
                                {r.status}
                              </span>
                            </small>
                          </small>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(r.updatedAt).toLocaleString("en-GB", {
                        timeZone: "UTC",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      UTC
                    </TableCell>
                    <TableCell>{r.rounds.length}</TableCell>
                    <TableCell>{metrics(recordRuns(r)).steps}</TableCell>
                    <TableCell>{metrics(recordRuns(r)).tools}</TableCell>
                    <TableCell>
                      {formatCoverage(coverage(recordRuns(r)))}
                    </TableCell>
                    <TableCell>
                      {r.outcome === "A" || r.outcome === "B"
                        ? `${r.outcome} wins`
                        : r.outcome}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!records.length && (
            <div className="admin-empty">
              No matching battles.
              <button
                onClick={() =>
                  set({
                    q: "",
                    node: "",
                    visit: "",
                    status: "",
                    outcome: "",
                    model: "",
                    method: "",
                  })
                }
              >
                Clear filters
              </button>
            </div>
          )}
          <div className="pagination">
            <button
              disabled={page <= 1}
              onClick={() => set({ page: String(page - 1) })}
            >
              ← Previous
            </button>
            <span>
              Page {page} / {Math.ceil(records.length / 25) || 1} · 25 per page
            </span>
            <button
              disabled={page * 25 >= records.length}
              onClick={() => set({ page: String(page + 1) })}
            >
              Next →
            </button>
          </div>
        </>
      )}
      <p className="admin-metric-note">
        No graph or missing trace = N/A. Coverage describes exploration, not
        clinical quality. Candidate outcomes count once per battle; frequency
        and step statistics use candidate executions per turn. Node filters
        check all matching usable executions within each battle. Chat votes and
        the public leaderboard are independent.
      </p>
    </>
  );
}
export function AdminDetail({ record }: { record: AdminRecord }) {
  const { f, query } = useFilters();
  const related = selectRecords({ ...f, batch: f.batch || "AKI pilot A" }),
    position = related.findIndex((r) => r.id === record.id);
  const [open, setOpen] = useState<Record<string, boolean>>({}),
    [inspector, setInspector] = useState(false),
    [candidate, setCandidate] = useState(
      Math.max(
        0,
        record.rounds[0].runs.findIndex((run) => run.method === "graph"),
      ),
    ),
    [cursors, setCursors] = useState([
      { turn: 0, step: Math.max(0, record.rounds[0].runs[0].steps.length - 1) },
      { turn: 0, step: Math.max(0, record.rounds[0].runs[1].steps.length - 1) },
    ]),
    [node, setNode] = useState("");
  const cursor = cursors[candidate],
    run = record.rounds[cursor.turn].runs[candidate];
  const step = run.steps[cursor.step];
  const state = step
    ? PREFIXES.get(step.id) ||
      timeline(record, candidate, cursor.turn, cursor.step)
    : timeline(record, candidate, cursor.turn, -1);
  const setCursor = (turn: number, step: number, c = candidate) =>
    setCursors((prev) => prev.map((v, i) => (i === c ? { turn, step } : v)));
  const focus = (ti: number, c: number, s: TraceStep, nodeId?: string) => {
    setCandidate(c);
    setCursor(
      ti,
      record.rounds[ti].runs[c].steps.findIndex((x) => x.id === s.id),
      c,
    );
    setNode(nodeId || s.queriedNodeIds[0] || "");
    setInspector(true);
    requestAnimationFrame(() =>
      document
        .querySelector(".exploration-inspector")
        ?.scrollIntoView({ block: "nearest" }),
    );
  };
  const styles = new Map<string, NodeStyle>();
  for (const id of state.returned)
    styles.set(id, { color: "#c4a768", label: "Tool-returned only" });
  for (const id of state.queried)
    styles.set(id, {
      color: "#333b45",
      active: true,
      label: "Previously explored",
    });
  for (const id of state.fresh)
    styles.set(id, { color: "#2563eb", active: true, label: "Newly explored" });
  for (const id of state.repeated)
    styles.set(id, {
      color: "#8b5cf6",
      active: true,
      label: "Repeated exploration",
    });
  const backToStep = () => {
    setInspector(false);
    if (step) {
      setOpen((o) => ({ ...o, [run.id]: true }));
      requestAnimationFrame(() => document.getElementById(step.id)?.focus());
    }
  };
  return (
    <>
      <div className="detail-navigation">
        <Link href={`/admin?${query}`} className="admin-back">
          ← Back to analysis
        </Link>
        <div>
          {position > 0 && (
            <Link href={`/admin/runs/${related[position - 1].id}?${query}`}>
              ← Previous battle
            </Link>
          )}
          {position >= 0 && position < related.length - 1 && (
            <Link href={`/admin/runs/${related[position + 1].id}?${query}`}>
              Next battle →
            </Link>
          )}
        </div>
      </div>
      <Heading title={record.title} />
      <div className="admin-run-meta">
        <span>
          {record.experiment} · {record.promptSet}
        </span>
        <span>
          {record.rounds.length === 1
            ? "Single pass"
            : `${record.rounds.length} conversation turns`}
        </span>
        <span className={`run-status ${record.status}`}>{record.status}</span>
        <span>Result: {record.outcome}</span>
        <button onClick={() => setInspector(!inspector)}>
          {inspector ? "Hide" : "Open"} Exploration inspector
        </button>
      </div>
      {record.rounds.length > 1 && (
        <nav className="turn-anchors" aria-label="Conversation turns">
          {record.rounds.map((t, i) => (
            <a key={t.id} href={`#${t.id}`}>
              Turn {i + 1} · {i === 0 ? "Case generation" : "Follow-up"}
            </a>
          ))}
        </nav>
      )}
      <div
        className={`conversation-workspace ${inspector ? "inspecting" : ""}`}
      >
        <div className="admin-conversation">
          {record.rounds.map((turn, ti) => (
            <section key={turn.id} id={turn.id} className="conversation-turn">
              <p className="turn-marker">Turn {ti + 1}</p>
              <Message from="user" className="admin-user-message"><MessageBubble><MessageBubbleContent>{turn.prompt}</MessageBubbleContent></MessageBubble></Message>
              <div className="admin-answer-grid">
                {turn.runs.map((r, c) => (
                  <Answer
                    key={r.id}
                    appearance="chat"
                    label={`Assistant ${c === 0 ? "A" : "B"}`}
                    method={`${r.model} · ${METHOD_NAMES[r.method]}`}
                    text={r.answer || ""}
                    emptyMessage={
                      r.status === "failed"
                        ? "Execution failed; final answer not recorded."
                        : "Execution interrupted; final answer not recorded."
                    }
                    loading={false}
                    beforeContent={
                      <div className="inside-execution">
                        <span className={`run-status ${r.status}`}>
                          {r.status}
                        </span>
                        <span className="muted">
                          {" "}
                          ·{" "}
                          {r.traceAvailable
                            ? "Authored execution trace"
                            : "Trace not recorded"}{" "}
                          · Graph coverage {formatCoverage(coverage([r]))}
                        </span>
                        <ExecutionMessages
                          recorded={r.traceAvailable}
                          steps={r.steps}
                          expanded={!!open[r.id]}
                          onExpandedChange={(v) =>
                            setOpen((o) => ({ ...o, [r.id]: v }))
                          }
                          selected={step?.id}
                          onSelect={(s) => focus(ti, c, s)}
                          onNode={(id, s) => focus(ti, c, s, id)}
                        />
                      </div>
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        {inspector && (
          <aside
            className="exploration-inspector"
            aria-label="Exploration inspector"
          >
            <div className="graph-view-heading">
              <h2>Exploration inspector</h2>
              <button onClick={backToStep}>Return to step ↗</button>
            </div>
            <div className="segmented">
              {[0, 1].map((c) => (
                <button
                  key={c}
                  aria-pressed={candidate === c}
                  onClick={() => setCandidate(c)}
                >
                  Assistant {c === 0 ? "A" : "B"}
                </button>
              ))}
            </div>
            <p className="muted">
              {run.model} · {METHOD_NAMES[run.method]}
            </p>
            <div className="inspector-navigation">
              <Filter
                label="Conversation turn"
                value={String(cursor.turn)}
                onChange={(v) => setCursor(Number(v), 0)}
                options={record.rounds.map((_, i) => [
                  String(i),
                  `Turn ${i + 1}`,
                ])}
              />
              <button
                disabled={!cursor.step}
                onClick={() => setCursor(cursor.turn, cursor.step - 1)}
              >
                ← Step
              </button>
              <button
                disabled={cursor.step >= run.steps.length - 1}
                onClick={() => setCursor(cursor.turn, cursor.step + 1)}
              >
                Step →
              </button>
            </div>
            <label className="step-timeline">
              {run.steps.length
                ? `Agent step ${cursor.step + 1} / ${run.steps.length} · ${step.label}`
                : "Steps not recorded"}
              <input
                aria-label="Agent step timeline"
                type="range"
                min={0}
                max={Math.max(0, run.steps.length - 1)}
                value={cursor.step}
                disabled={!run.steps.length}
                onChange={(e) => setCursor(cursor.turn, Number(e.target.value))}
              />
            </label>
            <p className="muted">
              {available(run)
                ? `${state.queried.size} / ${AKI_GRAPH.nodes.length} actively explored through this step${state.missingPrior ? " · Earlier trace missing; partial history" : ""}`
                : "Graph exploration N/A"}{" "}
              · Future events excluded.
            </p>
            <div className="graph-legend">
              Blue: new · Purple: revisit · Neutral: earlier · Ochre: returned
              only · Dashed edges: graph relations · Solid edges: recorded
              traversals
            </div>
            <ResearchGraph
              styles={styles}
              unknown={!available(run)}
              selected={node}
              onSelect={setNode}
              visitedEdges={state.edges}
              extra={
                <>
                  <p className="muted">
                    {state.first.has(node)
                      ? `First explored: turn ${state.first.get(node)!.turn + 1}, step ${state.first.get(node)!.step + 1}`
                      : "No exploration recorded by this step."}
                    <br />
                    {state.queryCounts.get(node) || 0} queries ·{" "}
                    {state.returnCounts.get(node) || 0} returns
                  </p>
                  {state.events
                    .filter(
                      (e) =>
                        e.event.queriedNodeIds.includes(node) ||
                        e.event.returnedNodeIds.includes(node),
                    )
                    .map((e) => (
                      <div key={e.event.id}>
                        <button
                          className="text-button"
                          onClick={() => setCursor(e.turn, e.step)}
                        >
                          Turn {e.turn + 1} · Step {e.step + 1}
                        </button>
                        {e.event.nodeNotes?.[node] && (
                          <p className="muted">{e.event.nodeNotes[node]}</p>
                        )}
                        <ToolMessages calls={e.event.tools} />
                      </div>
                    ))}
                </>
              }
            />
          </aside>
        )}
      </div>
    </>
  );
}
