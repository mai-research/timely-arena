import snapshot from "./snapshots/synthetic-demo.json";
import { DEMO_BATTLES } from "./examples";
import { type Method } from "@/lib/arena/types";
export type RunStatus = "completed" | "failed" | "interrupted";
export type ToolCall = {
  id: string;
  name: string;
  summary?: string;
  status: RunStatus;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  durationMs?: number;
};
export type TraceStep = {
  id: string;
  label: string;
  status: RunStatus;
  summary?: string;
  durationMs?: number;
  nodeNotes?: Record<string, string>;
  queriedNodeIds: string[];
  returnedNodeIds: string[];
  edgeIds: string[];
  tools: ToolCall[];
};
export type MethodRun = {
  id: string;
  candidateId: string;
  model: string;
  method: Method;
  status: RunStatus;
  answer?: string;
  graphVersion?: string;
  traceAvailable: boolean;
  steps: TraceStep[];
};
export type AdminRound = {
  id: string;
  prompt: string;
  runs: [MethodRun, MethodRun];
};
export type AdminRecord = {
  id: string;
  title: string;
  updatedAt: string;
  status: RunStatus;
  experiment: string;
  promptSet: string;
  graphVersion: string;
  outcome: "A" | "B" | "tie" | "unrated";
  rounds: AdminRound[];
};
export const AKI_GRAPH = snapshot;
export type GraphNode = (typeof snapshot.nodes)[number];
export const MODELS = [
  ...new Set(
    DEMO_BATTLES.flatMap((b) =>
      b.rounds.flatMap((t) => t.runs.map((r) => r.model)),
    ),
  ),
];
export const METHOD_NAMES = {
  llm: "LLM synthetic",
  graph: "Graph-query synthetic",
};
export const NODE_MAP = new Map(snapshot.nodes.map((n) => [n.id, n]));
export const EDGE_MAP = new Map(snapshot.edges.map((e) => [e.id, e]));
export const ADMIN_RECORDS: AdminRecord[] = DEMO_BATTLES;
export function recordRuns(r: AdminRecord) {
  return r.rounds.flatMap((t) => t.runs);
}
export function metrics(runs: MethodRun[]) {
  const steps = [
    ...new Map(runs.flatMap((r) => r.steps).map((s) => [s.id, s])).values(),
  ];
  return {
    steps: steps.length,
    tools: new Set(steps.flatMap((s) => s.tools.map((t) => t.id))).size,
  };
}
export function available(run: MethodRun) {
  return (
    run.method === "graph" &&
    run.traceAvailable &&
    run.graphVersion === snapshot.version
  );
}
export function coverage(runs: MethodRun[]) {
  const valid = runs.filter(available);
  if (!valid.length) return null;
  const ids = new Set(
    valid
      .flatMap((r) => r.steps.flatMap((s) => s.queriedNodeIds))
      .filter((id) => NODE_MAP.has(id)),
  );
  return {
    visited: ids.size,
    total: snapshot.nodes.length,
    percent: (100 * ids.size) / snapshot.nodes.length,
  };
}
export type Timeline = {
  queried: Set<string>;
  returned: Set<string>;
  edges: Set<string>;
  fresh: Set<string>;
  repeated: Set<string>;
  first: Map<string, { turn: number; step: number }>;
  queryCounts: Map<string, number>;
  returnCounts: Map<string, number>;
  events: { turn: number; step: number; event: TraceStep }[];
  missingPrior: boolean;
};
export function timeline(
  record: AdminRecord,
  candidate: number,
  turn: number,
  step: number,
): Timeline {
  const state: Timeline = {
    queried: new Set(),
    returned: new Set(),
    edges: new Set(),
    fresh: new Set(),
    repeated: new Set(),
    first: new Map(),
    queryCounts: new Map(),
    returnCounts: new Map(),
    events: [],
    missingPrior: false,
  };
  for (let t = 0; t <= turn; t++) {
    const run = record.rounds[t]?.runs[candidate];
    if (!run || !available(run)) {
      if (run?.method === "graph") state.missingPrior = true;
      continue;
    }
    for (let s = 0; s < run.steps.length && (t < turn || s <= step); s++) {
      const event = run.steps[s];
      state.events.push({ turn: t, step: s, event });
      for (const id of event.queriedNodeIds) {
        if (t === turn && s === step)
          (state.queried.has(id) ? state.repeated : state.fresh).add(id);
        if (!state.first.has(id)) state.first.set(id, { turn: t, step: s });
        state.queried.add(id);
        state.queryCounts.set(id, (state.queryCounts.get(id) || 0) + 1);
      }
      for (const id of event.returnedNodeIds) {
        state.returned.add(id);
        state.returnCounts.set(id, (state.returnCounts.get(id) || 0) + 1);
      }
      event.edgeIds.forEach((id) => state.edges.add(id));
    }
  }
  return state;
}
// Prefix snapshots and reverse index are computed once when the admin module loads.
export const PREFIXES = new Map<string, Timeline>();
export const NODE_EXECUTIONS = new Map<string, Set<string>>();
for (const r of ADMIN_RECORDS)
  r.rounds.forEach((t, ti) =>
    t.runs.forEach((run, c) =>
      run.steps.forEach((s, si) => {
        PREFIXES.set(s.id, timeline(r, c, ti, si));
        if (available(run))
          for (const id of new Set(s.queriedNodeIds)) {
            if (!NODE_EXECUTIONS.has(id)) NODE_EXECUTIONS.set(id, new Set());
            NODE_EXECUTIONS.get(id)!.add(run.id);
          }
      }),
    ),
  );
export type Filters = {
  q?: string;
  batch?: string;
  model?: string;
  method?: string;
  status?: string;
  outcome?: string;
  node?: string;
  visit?: string;
  sort?: string;
  direction?: string;
  page?: string;
  view?: string;
  groupA?: string;
  groupB?: string;
  mode?: string;
  frequency?: string;
  graphQuery?: string;
  graphType?: string;
  focusNode?: string;
};
export function selectRecords(f: Filters, records = ADMIN_RECORDS) {
  const query = (f.q || "").toLowerCase().trim();
  const filtered = records.filter((record) => {
    if (f.batch && f.batch !== "all" && record.experiment !== f.batch)
      return false;
    if (f.outcome && f.outcome !== "all" && record.outcome !== f.outcome)
      return false;
    if (
      query &&
      ![record.id, record.title, ...record.rounds.map((t) => t.prompt)].some(
        (s) => s.toLowerCase().includes(query),
      )
    )
      return false;
    const matching = recordRuns(record).filter(
      (run) =>
        (!f.model || f.model === "all" || run.model === f.model) &&
        (!f.method || f.method === "all" || run.method === f.method) &&
        (!f.status || f.status === "all" || run.status === f.status),
    );
    if (!matching.length) return false;
    if (f.node) {
      const usable = matching.filter(available);
      if (!usable.length) return false;
      const explored = usable.some((run) =>
        run.steps.some((step) => step.queriedNodeIds.includes(f.node!)),
      );
      return explored === (f.visit !== "not");
    }
    return true;
  });
  const direction = f.direction === "asc" ? 1 : -1;
  const value = (record: AdminRecord): string | number => {
    switch (f.sort) {
      case "steps":
        return metrics(recordRuns(record)).steps;
      case "tools":
        return metrics(recordRuns(record)).tools;
      case "turns":
        return record.rounds.length;
      case "coverage":
        return coverage(recordRuns(record))?.percent ?? -1;
      case "title":
        return record.title;
      default:
        return record.updatedAt;
    }
  };
  return filtered.sort((a, b) => {
    const x = value(a),
      y = value(b);
    return (
      direction *
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y))) || a.id.localeCompare(b.id)
    );
  });
}
export const groupKey = (run: Pick<MethodRun, "model" | "method">) =>
  `${run.model}|${run.method}`;
export function median(values: number[]) {
  if (!values.length) return null;
  const a = [...values].sort((a, b) => a - b);
  return (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2;
}
export function cohort(
  records: AdminRecord[],
  key: string,
  filters: Filters = {},
) {
  const executions = records.flatMap((b) =>
    b.rounds.flatMap((t) =>
      t.runs
        .filter(
          (r) =>
            groupKey(r) === key &&
            (!filters.model ||
              filters.model === "all" ||
              r.model === filters.model) &&
            (!filters.method ||
              filters.method === "all" ||
              r.method === filters.method) &&
            (!filters.status ||
              filters.status === "all" ||
              r.status === filters.status),
        )
        .map((r) => ({ battle: b, run: r })),
    ),
  );
  const valid = executions.filter((e) => available(e.run));
  const frequency = new Map<string, number>();
  const returned = new Set<string>();
  for (const { run } of valid) {
    for (const id of new Set(run.steps.flatMap((s) => s.queriedNodeIds)))
      frequency.set(id, (frequency.get(id) || 0) + 1);
    run.steps
      .flatMap((s) => s.returnedNodeIds)
      .forEach((id) => returned.add(id));
  }
  const candidates = [
    ...new Map(executions.map((e) => [e.run.candidateId, e])).values(),
  ];
  const outcomes = { wins: 0, losses: 0, ties: 0, unrated: 0 };
  for (const { battle, run } of candidates) {
    const side =
      battle.rounds[0].runs[0].candidateId === run.candidateId ? "A" : "B";
    if (battle.outcome === "unrated") outcomes.unrated++;
    else if (battle.outcome === "tie") outcomes.ties++;
    else if (battle.outcome === side) outcomes.wins++;
    else outcomes.losses++;
  }
  const logged = executions.filter((e) => e.run.traceAvailable);
  return {
    key,
    executions: executions.length,
    candidates: candidates.length,
    ...outcomes,
    available: valid.length,
    frequency,
    returned,
    coverage: coverage(valid.map((e) => e.run)),
    medianSteps: median(logged.map((e) => e.run.steps.length)),
    medianTools: median(logged.map((e) => metrics([e.run]).tools)),
  };
}
