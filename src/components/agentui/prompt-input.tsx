"use client";

// Adapted from https://www.agentui.pro/components/agents/prompt-input.
// The arena supplies its own toolbar and keeps the value controlled by the chat lifecycle.
import { useCallback, useEffect, useLayoutEffect, useRef, type FormEvent, type ReactNode, type TextareaHTMLAttributes } from "react";
import { ArrowUp, Square } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { SPRING_SWAP } from "./motion";

export interface PromptInputProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue" | "onChange" | "onSubmit" | "children"> {
  value: string;
  onValueChange?: (value: string) => void;
  onSubmit: (value: string) => void;
  loading?: boolean;
  onStop?: () => void;
  submitDisabled?: boolean;
  minRows?: number;
  maxRows?: number;
  leadingAction?: ReactNode;
  sendLabel?: string;
  stopLabel?: string;
}

export function PromptInput({ value, onValueChange, onSubmit, loading = false, onStop,
  disabled, submitDisabled = false, readOnly, minRows = 2, maxRows = 8, leadingAction,
  sendLabel = "Send follow-up", stopLabel = "Stop response", className,
  "aria-label": ariaLabel = "Follow-up question", onKeyDown, ...textareaProps
}: PromptInputProps) {
  const reduce = useReducedMotion();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const canSubmit = Boolean(value.trim()) && !disabled && !submitDisabled && !loading;

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    const measurement = measurementRef.current;
    if (!textarea || !measurement || textarea.value !== value) return;
    const style = getComputedStyle(textarea);
    const lineHeight = parseFloat(style.lineHeight);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const next = Math.min(Math.max(measurement.scrollHeight, minRows * lineHeight + padding), maxRows * lineHeight + padding);
    textarea.style.height = `${Math.ceil(next)}px`;
  }, [value, minRows, maxRows]);

  useLayoutEffect(resizeTextarea, [resizeTextarea]);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const observer = new ResizeObserver(resizeTextarea);
    observer.observe(textarea);
    let active = true;
    void document.fonts.ready.then(() => { if (active) resizeTextarea(); });
    return () => { active = false; observer.disconnect(); };
  }, [resizeTextarea]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSubmit) return;
    onSubmit(value.trim());
  }

  return <form className={cn("agent-prompt", className)} onSubmit={submit} aria-label={readOnly ? "Start a comparison" : "Follow-up composer"}>
    <div className="agent-prompt-field">
      <div ref={measurementRef} aria-hidden="true" className="agent-prompt-measure">{`${value}\u200b`}</div>
      <textarea ref={textareaRef} {...textareaProps} value={value} readOnly={readOnly}
        disabled={disabled || loading} aria-label={ariaLabel} rows={minRows} className="agent-prompt-text"
        onChange={event => onValueChange?.(event.target.value)}
        onKeyDown={event => {
          onKeyDown?.(event);
          // keyCode 229 also protects the final composition Enter in Safari.
          if (event.defaultPrevented || event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return;
          event.preventDefault();
          submit();
        }} />
    </div>
    <div className="agent-prompt-toolbar">
      <div className="agent-prompt-context">{leadingAction}</div>
      <Button type={loading ? "button" : "submit"} size="icon" className="agent-prompt-send"
        disabled={loading ? !onStop : !canSubmit} onClick={loading ? onStop : undefined}
        aria-label={loading ? stopLabel : sendLabel} title={loading ? stopLabel : sendLabel}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={loading ? "stop" : "send"} aria-hidden="true" className="agent-prompt-icon"
            initial={reduce ? false : { opacity: 0, y: 3, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -3, scale: 0.8 }} transition={reduce ? { duration: 0 } : SPRING_SWAP}>
            {loading ? <Square size={12} fill="currentColor" /> : <ArrowUp size={17} />}
          </motion.span>
        </AnimatePresence>
      </Button>
    </div>
  </form>;
}
