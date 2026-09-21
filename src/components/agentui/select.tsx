"use client";

// AgentUI Prompt Input / Select appearance, with Base UI providing keyboard,
// focus, portal positioning and listbox semantics. No model picker is implied.
// https://www.agentui.pro/components/agents/prompt-input
import type { ReactNode } from "react";
import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption<Value extends string> {
  value: Value;
  label: string;
  icon?: ReactNode;
  description?: string;
}

export function Select<Value extends string>({ label, value, onValueChange, options, placeholder = "Choose…", disabled, className }: {
  label: string;
  value: Value | null;
  onValueChange: (value: Value) => void;
  options: SelectOption<Value>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const selected = options.find(option => option.value === value);
  return <BaseSelect.Root value={value} onValueChange={next => { if (next !== null) onValueChange(next); }} items={options} disabled={disabled}>
    <BaseSelect.Trigger className={cn("agent-select-trigger", className)} aria-label={label} title={label}>
      {selected?.icon && <span aria-hidden="true" className="agent-select-icon">{selected.icon}</span>}
      <BaseSelect.Value placeholder={placeholder} />
      <BaseSelect.Icon className="agent-select-chevron"><ChevronDown size={13} /></BaseSelect.Icon>
    </BaseSelect.Trigger>
    <BaseSelect.Portal>
      <BaseSelect.Positioner side="bottom" align="start" sideOffset={8} alignItemWithTrigger={false} className="agent-select-positioner">
        <BaseSelect.Popup className="agent-select-popup">
          <div className="agent-select-label">{label}</div>
          <BaseSelect.List>
            {options.map(option => <BaseSelect.Item key={option.value} value={option.value} className="agent-select-option">
              {option.icon && <span aria-hidden="true" className="agent-select-icon">{option.icon}</span>}
              <span className="agent-select-copy"><BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                {option.description && <span className="agent-select-description">{option.description}</span>}</span>
              <BaseSelect.ItemIndicator className="agent-select-check"><Check size={14} /></BaseSelect.ItemIndicator>
            </BaseSelect.Item>)}
          </BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  </BaseSelect.Root>;
}
