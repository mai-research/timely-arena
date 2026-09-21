"use client";

// Adapted from Beautiful UI ThinkingState (MIT):
// https://www.beautifului.dev/r/thinking-state.json
// Retains its expandable trace/rail structure; records replace timed demo stages.
import { motion, useReducedMotion } from "motion/react";
import { ChevronDown, Sparkles } from "lucide-react";
import { NODE_MAP, type TraceStep } from "@/lib/admin/data";
import { OutputText } from "@/components/arena/pretext-text";
import { ToolChips } from "./tool-chips";

export function ThinkingState({
  steps,
  selected,
  onSelect,
  onNode,
  expanded,
  onExpandedChange,
  recorded = true,
}: {
  steps: TraceStep[];
  recorded?: boolean;
  selected?: string;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  onSelect: (step: TraceStep) => void;
  onNode: (id: string, step: TraceStep) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="admin-thinking">
      <button
        className="trace-toggle"
        aria-expanded={expanded}
        onClick={() => onExpandedChange(!expanded)}
      >
        <Sparkles size={15} />
        <span>
          Execution details
          {recorded
            ? ` · ${steps.length} steps · ${steps.reduce((n, s) => n + s.tools.length, 0)} calls · ${steps.some((s) => s.durationMs == null) ? "≥ " : ""}${(steps.reduce((n, s) => n + (s.durationMs || 0), 0) / 1000).toFixed(1)} s`
            : " · Not recorded"}
        </span>
        <ChevronDown
          size={15}
          style={{ transform: expanded ? "rotate(180deg)" : undefined }}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.18 }}
        className="trace-collapse"
        inert={!expanded}
      >
        <ol className="trace-rail">
          {steps.map((step, i) => (
            <li key={step.id}>
              <button
                id={step.id}
                className="trace-step"
                aria-pressed={selected === step.id}
                onClick={() => onSelect(step)}
              >
                <span className="step-number">{i + 1}</span>
                <span>{step.label}</span>
                <span className={`run-status ${step.status}`}>
                  {step.status}
                </span>
              </button>
              <div className="step-detail">
                <span className="trace-time">
                  {step.durationMs == null
                    ? "Duration not recorded"
                    : `${(step.durationMs / 1000).toFixed(2)} s`}
                </span>
                <span className="detail-label">Reasoning summary</span>
                {step.summary ? (
                  <OutputText text={step.summary} />
                ) : (
                  <p className="muted">Not recorded</p>
                )}
                {!!step.queriedNodeIds.length && (
                  <div className="node-chips">
                    <span className="muted">Actively queried</span>
                    {step.queriedNodeIds.map((id) => (
                      <button
                        key={id}
                        onClick={() => onNode(id, step)}
                        title={step.nodeNotes?.[id]} aria-label={`Inspect node ${id}`}
                      >
                        {NODE_MAP.get(id)?.name || id}
                      </button>
                    ))}
                  </div>
                )}
                {!!step.returnedNodeIds.length && (
                  <div className="node-chips">
                    <span className="muted">Tool-returned nodes</span>
                    {step.returnedNodeIds.map((id) => (
                      <button key={id} onClick={() => onNode(id, step)}>
                        {NODE_MAP.get(id)?.name || id}
                      </button>
                    ))}
                  </div>
                )}
                <ToolChips calls={step.tools} />
              </div>
            </li>
          ))}
        </ol>
        {!steps.length && (
          <p className="muted">Execution details not recorded.</p>
        )}
      </motion.div>
    </div>
  );
}
