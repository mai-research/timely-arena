import graph from "./snapshots/synthetic-demo.json";
import { fixtureAnswers } from "@/lib/arena/fixtures";
import { FOLLOWUPS } from "@/lib/arena/types";
import type { AdminRecord, MethodRun, TraceStep, ToolCall } from "./data";

const prompt =
  "Generate a concise one-paragraph adult AKI case with history, vital signs, urine output, laboratory findings, and examination findings. Do not state the diagnosis explicitly.";
const node = (id: string) => ({
  id,
  name: graph.nodes.find((n) => n.id === id)!.name,
});
const evidence = (ids: string[]) =>
  ids.map((id) => {
    const e = graph.edges.find((e) => e.id === id)!;
    return {
      id: e.id,
      from: node(e.source),
      relation: e.relation,
      to: node(e.target),
      sourceId: e.source_id,
      evidence: e.evidence,
      qualifiers: e.qualifiers,
    };
  });
type DraftStep = Omit<TraceStep, "id" | "tools"> & {
  call?: Omit<ToolCall, "id">;
};
function query(
  label: string,
  summary: string,
  queried: string[],
  returned: string[],
  edges: string[],
  name: string,
  input: Record<string, unknown>,
  durationMs: number,
  notes: Record<string, string> = {},
): DraftStep {
  return {
    label,
    summary,
    status: "completed",
    durationMs: durationMs + 180,
    queriedNodeIds: queried,
    returnedNodeIds: returned,
    edgeIds: edges,
    nodeNotes: notes,
    call: {
      name,
      status: "completed",
      summary: `${queried.length} nodes queried · ${returned.length} candidates returned · ${edges.length} evidence records`,
      durationMs,
      input,
      output: {
        nodes: returned.map(node),
        relationships: evidence(edges),
        provenance: "Authored demonstration; no live tool was called.",
      },
    },
  };
}
const locate = () =>
  query(
    "Locate the AKI entry point",
    "Match the request to the AKI concept. The lookup also returns staging and laboratory concepts; they remain candidates until explicitly inspected.",
    ["demo_aki"],
    ["demo_creatinine", "demo_urine", "demo_stage"],
    [],
    "graph.lookup",
    {
      query: "Acute Kidney Injury",
      types: ["Condition"],
      includeCandidates: true,
    },
    86,
    {
      demo_aki:
        "Entry point for this case; no severity stage is selected at lookup.",
    },
  );
const context = () =>
  query(
    "Explore fluid loss and medication exposure",
    "Follow the volume-depletion, NSAID and ARB branches selected for the 71-year-old patient. Keep these as context for the fictional history, not as proof of a cause.",
    ["demo_volume", "demo_nsaid", "demo_arb"],
    ["demo_aki"],
    ["demo_edge_357", "demo_edge_062", "demo_edge_065"],
    "graph.expand",
    {
      nodeIds: ["demo_volume", "demo_nsaid", "demo_arb"],
      direction: "outgoing",
      relations: ["risk_factor_for", "causes"],
      maxHops: 1,
    },
    142,
    {
      demo_volume: "Matches four days of diarrhea and poor fluid intake.",
      demo_nsaid: "Naproxen in the case maps to the NSAID class.",
      demo_arb: "Losartan in the case maps to the ARB class.",
    },
  );
const labs = () =>
  query(
    "Read creatinine and urine-output evidence",
    "Open the two measurement concepts returned by the lookup. Save their distinct source relationships rather than merging parallel creatinine criteria into a single edge.",
    ["demo_creatinine", "demo_urine"],
    ["demo_aki", "demo_oliguria"],
    ["demo_edge_041", "demo_edge_042", "demo_edge_043", "demo_edge_049"],
    "graph.read_evidence",
    {
      nodeIds: ["demo_creatinine", "demo_urine"],
      sourceIds: ["demo_source"],
      includeQualifiers: true,
    },
    173,
    {
      demo_creatinine:
        "Relates the authored baseline of 0.9 mg/dL to the current 2.8 mg/dL.",
      demo_urine:
        "Preserves the original 240 mL / 24 hours, without inventing a patient weight.",
    },
  );
const revisit = () =>
  query(
    "Revisit the baseline before writing",
    "Return to creatinine and inspect its baseline concept. Keep both values and the time course explicit; do not turn a graph coverage statistic into a clinical confidence score.",
    ["demo_creatinine", "demo_baseline"],
    ["demo_creatinine", "demo_aki"],
    ["demo_edge_304", "demo_edge_178"],
    "graph.read_evidence",
    {
      nodeIds: ["demo_creatinine", "demo_baseline"],
      edgeIds: ["demo_edge_304", "demo_edge_178"],
      purpose: "preserve baseline context",
    },
    104,
    {
      demo_creatinine: "A deliberate revisit to check the same creatinine values.",
      demo_baseline:
        "Newly opened baseline concept; distinct from the current measurement.",
    },
  );
function audit(short = false): DraftStep {
  return {
    label: short
      ? "Check the follow-up against the original case"
      : "Check the final vignette",
    summary: short
      ? "Compare the follow-up with the saved first-turn case. Preserve age, medications and all quoted laboratory values; introduce no new findings."
      : "Review the authored draft for the requested fields, one-paragraph format and absence of an explicit diagnosis. This step checks the saved example, not the graph.",
    status: "completed",
    durationMs: 310,
    queriedNodeIds: [],
    returnedNodeIds: [],
    edgeIds: [],
    call: {
      name: "case.check_constraints",
      status: "completed",
      summary:
        "Format and case-value checks recorded · no additional graph visits",
      durationMs: 64,
      input: {
        caseId: "graph-example-71",
        checks: [
          "one_paragraph",
          "preserve_case_values",
          ...(short ? [] : ["no_explicit_diagnosis"]),
        ],
      },
      output: {
        authoredDemo: true,
        format: "one paragraph",
        preserved: {
          age: 71,
          creatinine_mg_dL: [0.9, 2.8],
          urine_mL_24h: 240,
          medications: ["losartan", "naproxen"],
        },
        issues: [],
        scope: "Illustrative content checks, not clinical validation.",
      },
    },
  };
}
function graphRun(
  battle: string,
  side: number,
  turn: number,
  model: string,
  strategy: "context" | "criteria",
  retry = false,
): MethodRun {
  const id = `${battle}-t${turn + 1}-${side}`;
  let drafts: DraftStep[];
  if (turn === 0)
    drafts =
      strategy === "context"
        ? [locate(), context(), labs(), revisit(), audit()]
        : [locate(), labs(), revisit(), context(), audit()];
  else
    drafts = [
      query(
        "Reopen the findings requested in the follow-up",
        "Revisit creatinine and urine output from turn 1. Read the oliguria concept that was previously returned, then keep the explanation tied to this patient rather than adding a new case.",
        ["demo_creatinine", "demo_urine", "demo_oliguria"],
        ["demo_aki"],
        ["demo_edge_041", "demo_edge_043", "demo_edge_055"],
        "graph.read_evidence",
        {
          nodeIds: ["demo_creatinine", "demo_urine", "demo_oliguria"],
          sourceIds: ["demo_source"],
          previousCaseId: "graph-example-71",
        },
        118,
        {
          demo_creatinine:
            "Previously explored in turn 1; the laboratory values are unchanged.",
          demo_urine:
            "Previously explored in turn 1; revisit the recorded urine-output window.",
          demo_oliguria:
            "Previously returned only; now actively opened to explain the low output.",
        },
      ),
      query(
        "Connect the follow-up to the recorded history",
        "Read the diarrhea and hypotension nodes for the first time. They explain which history and examination clues were included in the original vignette; no new patient facts are added.",
        ["demo_diarrhoea", "demo_pressure"],
        ["demo_aki"],
        ["demo_edge_068", "demo_edge_071"],
        "graph.expand",
        {
          nodeIds: ["demo_diarrhoea", "demo_pressure"],
          maxHops: 1,
          relations: ["risk_factor_for"],
        },
        96,
        {
          demo_diarrhoea:
            "New exploration in turn 2, linked to the already stated diarrhea.",
          demo_pressure:
            "New exploration in turn 2, linked to the original 88/54 mmHg reading.",
        },
      ),
      audit(true),
    ];
  if (retry) {
    const target = drafts.findIndex(
      (s) => s.label === "Read creatinine and urine-output evidence",
    );
    const attempt = {
      ...labs(),
      label: "Evidence request timed out",
      summary:
        "The evidence request did not return within the demo timeout. Record the attempted nodes, but add no returned candidates or traversed edges.",
      status: "failed" as const,
      durationMs: 2000,
      returnedNodeIds: [],
      edgeIds: [],
      call: {
        name: "graph.read_evidence",
        status: "failed" as const,
        summary: "Timeout · no result received; a separate retry follows",
        input: { nodeIds: ["demo_creatinine", "demo_urine"], timeoutMs: 2000 },
        error: "DEMO_TIMEOUT: no evidence payload received.",
        durationMs: 2000,
      },
    };
    drafts.splice(target, 0, attempt);
    drafts[target + 1] = {
      ...drafts[target + 1],
      label: "Retry the evidence request",
      summary:
        "Retry the same nodes with a narrower source filter. Retain the failed call separately and add returned nodes only after this successful result.",
      call: {
        ...drafts[target + 1].call!,
        input: {
          ...drafts[target + 1].call!.input,
          retryOf: `${id}-s${target + 1}-call`,
        },
      },
    };
  }
  const steps = drafts.map((draft, i) => {
    const { call, ...step } = draft;
    return {
      ...step,
      id: `${id}-s${i + 1}`,
      tools: call ? [{ ...call, id: `${id}-s${i + 1}-call` }] : [],
    };
  });
  return {
    id,
    candidateId: `${battle}-${side}`,
    model,
    method: "graph",
    status: "completed",
    traceAvailable: true,
    graphVersion: graph.version,
    steps,
    answer: fixtureAnswers(turn === 0 ? prompt : FOLLOWUPS[0], turn === 0).find(
      (a) => a.method === "graph",
    )!.text,
  };
}
function llmRun(battle: string): MethodRun {
  return {
    id: `${battle}-t1-0`,
    candidateId: `${battle}-0`,
    model: "GPT-5.6 Sol",
    method: "llm",
    status: "completed",
    traceAvailable: true,
    answer: fixtureAnswers(prompt, true).find((a) => a.method === "llm")!.text,
    steps: [
      {
        id: `${battle}-llm-compose`,
        label: "Compose the separate synthetic case",
        summary:
          "Use the authored 68-year-old patient with vomiting, diarrhea, lisinopril and ibuprofen. This candidate has no graph access; its case values must not be mixed with the graph candidate’s 71-year-old patient.",
        durationMs: 820,
        status: "completed",
        queriedNodeIds: [],
        returnedNodeIds: [],
        edgeIds: [],
        tools: [],
      },
      {
        id: `${battle}-llm-check`,
        label: "Check the requested fields",
        summary:
          "Retain the stated baseline and current creatinine, urine-output window and medication history. Keep the response to one paragraph without stating the diagnosis.",
        durationMs: 260,
        status: "completed",
        queriedNodeIds: [],
        returnedNodeIds: [],
        edgeIds: [],
        tools: [],
      },
    ],
  };
}
const common = {
  experiment: "AKI pilot A",
  promptSet: "aki-case-v1",
  graphVersion: graph.version,
  status: "completed" as const,
};
export const DEMO_BATTLES: AdminRecord[] = [
  {
    ...common,
    id: "aki-complete",
    title: "AKI · exploration across a follow-up",
    updatedAt: "2026-09-08T09:00:00Z",
    outcome: "tie",
    rounds: [prompt, FOLLOWUPS[0]].map((text, t) => ({
      id: `aki-complete-turn-${t + 1}`,
      prompt: text,
      runs: [
        graphRun("aki-complete", 0, t, "GPT-5.6 Sol", "context"),
        graphRun("aki-complete", 1, t, "Claude Opus 5", "criteria"),
      ],
    })),
  },
  {
    ...common,
    id: "aki-tool-failure",
    title: "AKI · single pass with an evidence retry",
    updatedAt: "2026-09-08T08:30:00Z",
    outcome: "unrated",
    rounds: [
      {
        id: "aki-tool-failure-turn-1",
        prompt,
        runs: [
          llmRun("aki-tool-failure"),
          graphRun("aki-tool-failure", 1, 0, "Claude Opus 5", "context", true),
        ],
      },
    ],
  },
];
