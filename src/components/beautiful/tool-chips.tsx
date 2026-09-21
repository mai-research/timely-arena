"use client";

// Adapted from Beautiful UI ToolChips (MIT):
// https://www.beautifului.dev/r/tool-chips.json
// Keeps expandable tool rows; stable call IDs replace labels as keys.
// Removes demo timers, file-diff previews and unrelated fixture defaults.
import { useState } from "react";
import { ChevronRight, Terminal } from "lucide-react";
import type { ToolCall } from "@/lib/admin/data";

export function ToolChips({ calls }: { calls: ToolCall[] }) {
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  return (
    <div className="admin-tools">
      {calls.map((call) => {
        const open = openRows.has(call.id);
        return (
          <div key={call.id} className="tool-row">
            <button
              aria-expanded={open}
              onClick={() =>
                setOpenRows((current) => {
                  const next = new Set(current);
                  if (next.has(call.id)) next.delete(call.id);
                  else next.add(call.id);
                  return next;
                })
              }
            >
              <Terminal size={13} />
              <span className="tool-summary">
                <code>{call.name}</code>
                {call.summary && <small>{call.summary}</small>}
              </span>
              <span className={`run-status ${call.status}`}>{call.status}</span>
              <ChevronRight
                size={14}
                style={{ transform: open ? "rotate(90deg)" : undefined }}
              />
            </button>
            {open && (
              <div className="tool-detail">
                <p className="muted">
                  {call.id} ·{" "}
                  {call.durationMs == null
                    ? "Duration not recorded"
                    : `${call.durationMs} ms`}
                </p>
                <span className="detail-label">Parameters</span>
                <pre>{JSON.stringify(call.input, null, 2)}</pre>
                <span className="detail-label">
                  {call.error ? "Error" : "Result"}
                </span>
                <pre>
                  {call.error ??
                    (call.output === undefined
                      ? "Not recorded"
                      : JSON.stringify(call.output, null, 2))}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
