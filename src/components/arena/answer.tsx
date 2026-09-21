"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Expand } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { OutputText } from "./pretext-text";
import { Button } from "@/components/agentui/button";
import { Message, MessageBubble, MessageBubbleContent, MessageTyping } from "@/components/agentui/message";

type AnswerAppearance = "default" | "chat";

export function AnswerHeader({
  label,
  method,
  text,
  loading,
  expandedContent,
  description = "Fixed synthetic AKI example",
  appearance = "default",
}: {
  label: string;
  method?: string;
  text: string;
  loading: boolean;
  expandedContent?: ReactNode;
  description?: string;
  appearance?: AnswerAppearance;
}) {
  const [copyState, setCopyState] = useState("");
  useEffect(() => {
    if (!copyState) return;
    const timer = window.setTimeout(() => setCopyState(""), 1800);
    return () => window.clearTimeout(timer);
  }, [copyState]);
  const Action = appearance === "chat" ? Button : "button";
  const actionProps = appearance === "chat" ? { variant: "ghost" as const, size: "icon" as const } : {};
  return (
    <>
      <header className={appearance === "chat" ? "agent-answer-header" : undefined}>
        <div>
          <span className="answer-label">{label}</span>
          {method && <span className="answer-method">{method}</span>}
        </div>
        <div className={`answer-actions${appearance === "chat" ? " agent-answer-actions" : ""}`}>
          <Action {...actionProps}
            type="button"
            disabled={!text || loading}
            aria-label={`Copy ${label}`}
            title={copyState || "Copy answer"}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopyState("Copied");
              } catch {
                setCopyState("Copy unavailable; select the text instead.");
              }
            }}
          >
            {copyState === "Copied" ? <Check size={15} /> : <Copy size={15} />}
          </Action>
          {copyState === "Copied" && (
            <span className="copy-feedback" role="status">
              Copied
            </span>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Action {...actionProps} type="button"
                disabled={!text}
                aria-label={`Expand ${label}`}
                title="Expand answer"
              >
                <Expand size={15} />
              </Action>
            </DialogTrigger>
            <DialogContent size="lg" className={`answer-fluid-dialog${appearance === "chat" ? " agent-answer-dialog" : ""}`}>
              <DialogHeader>
                <DialogTitle>
                  {label}
                  {method ? ` · ${method}` : ""}
                </DialogTitle>
                <DialogDescription>
                  {description}
                </DialogDescription>
              </DialogHeader>
              {expandedContent ?? <OutputText text={text} />}
            </DialogContent>
          </Dialog>
        </div>
      </header>
      <span className="copy-error" role="status">
        {copyState && copyState !== "Copied" ? copyState : ""}
      </span>
    </>
  );
}

export function Answer({ label, method, text, loading, emptyMessage, beforeContent, appearance = "default", animateIn = false }: {
  label: string; method?: string; text: string; loading: boolean;
  emptyMessage?: string; beforeContent?: ReactNode;
  appearance?: AnswerAppearance; animateIn?: boolean;
}) {
  if (appearance === "chat") return <Message from="assistant" aria-label={label} aria-busy={loading} className="agent-answer" animateIn={animateIn}>
    <MessageBubble variant="outline"><MessageBubbleContent>
      <AnswerHeader label={label} method={method} text={text} loading={loading} appearance="chat" />
      {beforeContent}
      <div className="agent-answer-body">
        {text ? <OutputText text={text} /> : loading ? <MessageTyping label="Loading clinical example…" /> : <p className="muted">{emptyMessage ?? "No content received."}</p>}
      </div>
      {loading && text && <div className="agent-answer-status"><MessageTyping label="Loading clinical example…" /></div>}
    </MessageBubbleContent></MessageBubble>
  </Message>;
  return (
    <article className="answer-card" aria-label={label}>
      <AnswerHeader label={label} method={method} text={text} loading={loading} />
      {beforeContent}
      <div className="answer-body">
        {text ? (
          <OutputText text={text} />
        ) : emptyMessage && !loading ? (
          <p className="muted">{emptyMessage}</p>
        ) : (
          <div className="answer-loading" aria-label="Loading example">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
      {loading && <span className="answer-streaming">Loading example…</span>}
    </article>
  );
}
