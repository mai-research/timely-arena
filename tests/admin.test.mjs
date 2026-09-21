import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const load = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve the same local TypeScript modules as Next, without a second test build.
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, parent, ...rest) {
  if (name.startsWith("@/")) name = path.join(dirname, "../src", name.slice(2));
  return resolve.call(this, name, parent, ...rest);
};
load.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const {
  ADMIN_RECORDS,
  AKI_GRAPH,
  NODE_MAP,
  EDGE_MAP,
  coverage,
  metrics,
  recordRuns,
  selectRecords,
  cohort,
  groupKey,
  timeline,
  PREFIXES,
  NODE_EXECUTIONS,
} = load("../src/lib/admin/data.ts");
const { adminDemoEnabled } = load("../src/lib/admin/config.ts");
test("admin flag is explicit opt in", () => {
  const old = process.env.ADMIN_DEMO_ENABLED;
  try {
    for (const v of ["false", "1", "TRUE", ""]) {
      process.env.ADMIN_DEMO_ENABLED = v;
      assert.equal(adminDemoEnabled(), false);
    }
    process.env.ADMIN_DEMO_ENABLED = "true";
    assert.equal(adminDemoEnabled(), true);
  } finally {
    if (old === undefined) delete process.env.ADMIN_DEMO_ENABLED;
    else process.env.ADMIN_DEMO_ENABLED = old;
  }
});
test("synthetic graph preserves identities, references and parallel relations", () => {
  assert.equal(AKI_GRAPH.nodes.length, 19);
  assert.equal(AKI_GRAPH.edges.length, 18);
  assert.equal(NODE_MAP.size, 19);
  assert.equal(EDGE_MAP.size, 18);
  assert.equal(AKI_GRAPH.sources.length, 1);
  const pairs = new Map();
  for (const e of AKI_GRAPH.edges) {
    assert.ok(NODE_MAP.has(e.source) && NODE_MAP.has(e.target));
    assert.ok(e.id);
    pairs.set(
      `${e.source}:${e.target}`,
      (pairs.get(`${e.source}:${e.target}`) || 0) + 1,
    );
  }
  assert.ok([...pairs.values()].some((n) => n > 1));
  assert.equal(Object.keys(AKI_GRAPH.positions).length, 19);
  assert.match(AKI_GRAPH.version, /[a-f0-9]{64}$/);
  assert.match(AKI_GRAPH.status, /Synthetic/);
});
test("two curated battles with single-pass and follow-up, stable candidates", () => {
  assert.equal(ADMIN_RECORDS.length, 2);
  assert.equal(ADMIN_RECORDS.filter((r) => r.rounds.length === 1).length, 1);
  assert.equal(ADMIN_RECORDS.filter((r) => r.rounds.length > 1).length, 1);
  assert.deepEqual(
    new Set(ADMIN_RECORDS.map((r) => r.rounds.length)),
    new Set([1, 2]),
  );
  const ids = [];
  for (const b of ADMIN_RECORDS)
    for (const t of b.rounds)
      t.runs.forEach((r, c) => {
        assert.equal(r.candidateId, b.rounds[0].runs[c].candidateId);
        assert.equal(r.model, b.rounds[0].runs[c].model);
        assert.equal(r.method, b.rounds[0].runs[c].method);
        ids.push(r.id);
        for (const s of r.steps) {
          ids.push(s.id, ...s.tools.map((t) => t.id));
          assert.ok(
            [...s.queriedNodeIds, ...s.returnedNodeIds].every((n) =>
              NODE_MAP.has(n),
            ),
          );
          assert.ok(s.edgeIds.every((e) => EDGE_MAP.has(e)));
        }
      });
  assert.equal(new Set(ids).size, ids.length);
});
test("query coverage excludes return-only nodes, deduplicates revisits, and rejects unavailable or different-version traces", () => {
  const run = recordRuns(ADMIN_RECORDS[0])[0];
  const s = {
    ...run.steps[0],
    queriedNodeIds: ["demo_aki", "demo_aki"],
    returnedNodeIds: ["demo_creatinine"],
  };
  const probe = { ...run, steps: [s, s] };
  assert.equal(coverage([probe]).visited, 1);
  assert.equal(coverage([probe]).total, 19);
  assert.equal(coverage([{ ...probe, graphVersion: "other" }]), null);
  assert.equal(coverage([{ ...probe, traceAvailable: false }]), null);
  assert.equal(coverage([{ ...probe, method: "llm" }]), null);
  assert.equal(coverage([{ ...probe, steps: [] }]).visited, 0);
  assert.deepEqual(metrics([run, run]), metrics([run]));
});
test("frequency denominator counts usable executions, not visits or all samples", () => {
  const b = ADMIN_RECORDS[0],
    run = b.rounds[0].runs[0],
    id = run.steps[0].queriedNodeIds[0];
  const c = cohort([b], groupKey(run));
  const executions = b.rounds
    .flatMap((t) => t.runs)
    .filter((r) => groupKey(r) === groupKey(run));
  assert.equal(c.available, executions.length);
  assert.equal(
    c.frequency.get(id),
    executions.filter((r) => r.steps.some((s) => s.queriedNodeIds.includes(id)))
      .length,
  );
  const doubled = cohort([b, b], groupKey(run));
  assert.equal(
    doubled.frequency.get(id) / doubled.available,
    c.frequency.get(id) / c.available,
  );
  const missing = {
    ...b,
    rounds: [
      {
        ...b.rounds[0],
        runs: [{ ...run, traceAvailable: false }, b.rounds[0].runs[1]],
      },
    ],
  };
  assert.equal(cohort([missing], groupKey(run)).available, 0);
  assert.equal(cohort([missing], groupKey(run)).coverage, null);
});
test("timeline includes earlier turns, excludes future events, separates current revisits and A/B histories", () => {
  const b = ADMIN_RECORDS[0];
  const first = timeline(b, 0, 0, 0),
    later = timeline(b, 0, 1, 0);
  for (const n of first.queried) assert.ok(later.queried.has(n));
  assert.equal(first.events.length, 1);
  assert.equal(later.events.length, b.rounds[0].runs[0].steps.length + 1);
  const repeat = timeline(b, 0, 0, 3);
  assert.ok(repeat.repeated.has("demo_creatinine"));
  assert.equal(repeat.events.length, 4);
  const rewind = timeline(b, 0, 0, 0);
  assert.deepEqual(rewind, first);
  assert.notEqual(
    timeline(b, 1, 0, 0).events[0].event.id,
    first.events[0].event.id,
  );
  assert.deepEqual(PREFIXES.get(b.rounds[1].runs[0].steps[0].id), later);
});
test("evidence retry retains failure separately and only successful results add returned nodes", () => {
  const run = ADMIN_RECORDS[1].rounds[0].runs[1];
  const failed = run.steps.find((s) => s.status === "failed");
  assert.ok(failed);
  assert.equal(failed.tools[0].output, undefined);
  assert.deepEqual(failed.returnedNodeIds, []);
  assert.deepEqual(failed.edgeIds, []);
  const retry = run.steps.find(
    (s) => s.tools[0]?.input.retryOf === failed.tools[0].id,
  );
  assert.ok(retry);
  assert.notEqual(retry.tools[0].id, failed.tools[0].id);
  assert.equal(retry.status, "completed");
  assert.ok(retry.returnedNodeIds.length);
  assert.equal(run.status, "completed");
  assert.ok(run.answer);
  assert.ok(run.steps.every((s) => s.summary));
});
test("curated node notes and evidence correspond to the actual graph", () => {
  for (const battle of ADMIN_RECORDS)
    for (const run of recordRuns(battle))
      for (const step of run.steps) {
        assert.ok(!step.summary?.includes("selected graph concepts"));
        for (const id of Object.keys(step.nodeNotes || {}))
          assert.ok(step.queriedNodeIds.includes(id));
        for (const call of step.tools) {
          assert.ok(call.summary);
          for (const relation of call.output?.relationships || []) {
            assert.ok(step.edgeIds.includes(relation.id));
            assert.equal(relation.evidence, EDGE_MAP.get(relation.id).evidence);
          }
        }
      }
});
test("URL filters search, node reverse lookup, numerical sorting and page boundaries are consistent", () => {
  assert.equal(
    selectRecords({ q: "evidence retry" })[0].id,
    "aki-tool-failure",
  );
  assert.equal(selectRecords({ q: "no matching record" }).length, 0);
  assert.equal(selectRecords({ batch: "AKI pilot A" }).length, 2);
  const node = ADMIN_RECORDS[0].rounds[0].runs[0].steps[0].queriedNodeIds[0];
  const selected = selectRecords({ node, visit: "yes" });
  assert.ok(selected.length);
  for (const b of selected)
    assert.ok(recordRuns(b).some((r) => NODE_EXECUTIONS.get(node)?.has(r.id)));
  for (const b of selectRecords({ node, visit: "not" }))
    assert.ok(
      recordRuns(b)
        .filter((r) => r.method === "graph" && r.traceAvailable)
        .every((r) => !r.steps.some((s) => s.queriedNodeIds.includes(node))),
    );
  const sorted = selectRecords({ sort: "steps", direction: "asc" });
  assert.ok(
    sorted.every(
      (b, i) =>
        i === 0 ||
        metrics(recordRuns(sorted[i - 1])).steps <=
          metrics(recordRuns(b)).steps,
    ),
  );
  assert.equal(sorted.slice(0, 25).length, 2);
  assert.equal(sorted.slice(25, 50).length, 0);
});
test("large fixture collection aggregates and filters without mutating source records", () => {
  const start = performance.now();
  const records = Array.from({ length: 1200 }, () => ADMIN_RECORDS).flat();
  const before = JSON.stringify(ADMIN_RECORDS);
  const rows = selectRecords(
    { batch: "AKI pilot A", method: "graph" },
    records,
  );
  const c = cohort(rows, groupKey(rows[0].rounds[0].runs[0]));
  assert.ok(c.executions > 0);
  assert.equal(JSON.stringify(ADMIN_RECORDS), before);
  assert.ok(
    performance.now() - start < 3000,
    "2400-battle analysis should stay below 3 seconds",
  );
});

test("battle subgraph excludes unseen nodes, preserves parallel links and isolates library mutations", () => {
  const { explorationSubgraph } = load("../src/lib/admin/exploration-graph.ts");
  const first = timeline(ADMIN_RECORDS[0], 0, 0, 0),
    last = timeline(ADMIN_RECORDS[0], 0, 0, 3);
  const initial = explorationSubgraph(first.queried, first.edges),
    later = explorationSubgraph(last.queried, last.edges);
  assert.equal(initial.nodes.length, first.queried.size);
  assert.equal(later.nodes.length, last.queried.size);
  assert.ok(initial.nodes.length < 19);
  assert.ok(
    initial.links.every(
      (e) => first.queried.has(e.source) && first.queried.has(e.target),
    ),
  );
  const pair = explorationSubgraph(["demo_aki", "demo_creatinine"], new Set());
  assert.ok(pair.links.length > 1);
  assert.equal(new Set(pair.links.map((e) => e.id)).size, pair.links.length);
  const old = NODE_MAP.get(pair.nodes[0].id).name;
  pair.nodes[0].name = "library mutation";
  assert.equal(NODE_MAP.get(pair.nodes[0].id).name, old);
  assert.equal(explorationSubgraph([], new Set()).nodes.length, 0);
  assert.deepEqual(explorationSubgraph(first.queried, first.edges), initial);
});


test("public graph contains only synthetic sources and no external evidence", () => {
  assert.match(AKI_GRAPH.version, /^synthetic-demo-sha256-/);
  assert.ok(AKI_GRAPH.sources.every(s => s.source_kind === "synthetic"));
  assert.ok(AKI_GRAPH.nodes.every(n => n.id.startsWith("demo_") && !("omop" in n)));
  assert.ok(AKI_GRAPH.edges.every(e => e.source_id === "demo_source" && e.strength === "synthetic" && e.evidence.startsWith("Authored synthetic UI association")));
  assert.equal(fs.existsSync(path.join(dirname, "../src/lib/admin/snapshots/aki-v2.json")), false);
});
