"use client";

import { ChevronDown, Check, CircleAlert, Terminal } from "lucide-react";
import { Message, MessageBubble, MessageBubbleContent } from "@/components/agentui/message";
import { Button } from "@/components/agentui/button";
import { NODE_MAP, type ToolCall, type TraceStep } from "@/lib/admin/data";

// Project-owned execution disclosures composed from the same AgentUI message
// primitives as chats. All content comes from the authored Admin fixtures.
export function ToolMessages({ calls }: { calls: ToolCall[] }) {
  return <div className="admin-tool-messages">{calls.map(call => <Message from="assistant" key={call.id} aria-label={`Mock tool call ${call.name}`} className="admin-tool-message">
    <MessageBubble variant="soft"><MessageBubbleContent>
      <details className="admin-tool-disclosure">
        <summary>
          <Terminal size={14} aria-hidden="true" />
          <span className="admin-tool-title"><code>{call.name}</code>{call.summary && <small>{call.summary}</small>}</span>
          <span className={`admin-tool-status ${call.status}`} title={call.status}>{call.status === "completed" ? <Check size={13} /> : <CircleAlert size={13} />}<span>{call.status}</span></span>
          <ChevronDown className="admin-tool-chevron" size={14} aria-hidden="true" />
        </summary>
        <div className="admin-tool-payload">
          <p className="admin-tool-meta">Mock call · {call.id} · {call.durationMs == null ? "Duration not recorded" : `${call.durationMs} ms`}</p>
          <span className="detail-label">Parameters</span><pre tabIndex={0} aria-label={`${call.name} parameters`}>{JSON.stringify(call.input, null, 2)}</pre>
          <span className="detail-label">{call.error !== undefined ? "Error" : "Result"}</span>
          <pre tabIndex={0} aria-label={`${call.name} ${call.error !== undefined ? "error" : "result"}`}>{call.error ?? (call.output === undefined ? "Not recorded" : JSON.stringify(call.output, null, 2))}</pre>
        </div>
      </details>
    </MessageBubbleContent></MessageBubble>
  </Message>)}</div>;
}

export function ExecutionMessages({ steps, recorded = true, selected, expanded, onExpandedChange, onSelect, onNode }: {
  steps: TraceStep[]; recorded?: boolean; selected?: string; expanded: boolean;
  onExpandedChange: (open: boolean) => void; onSelect: (step: TraceStep) => void; onNode: (id: string, step: TraceStep) => void;
}) {
  const calls = steps.reduce((sum, step) => sum + step.tools.length, 0);
  return <div className="admin-execution-messages">
    <div className="admin-execution-heading"><span>{recorded ? `Mock tool usage · ${calls} ${calls === 1 ? "call" : "calls"}` : "Tool usage not recorded"}</span>
      {!!steps.length && <Button variant="ghost" size="sm" aria-expanded={expanded} onClick={() => onExpandedChange(!expanded)}>{expanded ? "Hide" : "Show"} execution details<ChevronDown size={13} /></Button>}
    </div>
    {recorded && calls === 0 && <p className="admin-execution-empty">No tool calls recorded for this execution.</p>}
    {steps.filter(step => expanded || step.tools.length).map(step => <section key={step.id} className="admin-execution-step">
      <Button id={step.id} variant="ghost" size="sm" className="admin-step-select" aria-pressed={selected === step.id} onClick={() => onSelect(step)}>
        <span>{String(steps.indexOf(step) + 1).padStart(2, "0")}</span>{step.label}<span className={`run-status ${step.status}`}>{step.status}</span>
      </Button>
      {expanded && <div className="admin-step-summary">
        <span className="detail-label">Authored step summary · {step.durationMs == null ? "Duration not recorded" : `${(step.durationMs / 1000).toFixed(2)} s`}</span>
        <p>{step.summary ?? "Not recorded"}</p>
        {([["Actively queried", step.queriedNodeIds], ["Tool-returned nodes", step.returnedNodeIds]] as const).map(([label, ids]) => ids.length > 0 && <div className="node-chips" key={label}>
          <span className="muted">{label}</span>{ids.map(id => <button key={id} onClick={() => onNode(id, step)} title={step.nodeNotes?.[id]} aria-label={`Inspect node ${id}`}>{NODE_MAP.get(id)?.name ?? id}</button>)}
        </div>)}
      </div>}
      <ToolMessages calls={step.tools} />
    </section>)}
  </div>;
}
