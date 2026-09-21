"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Check, ArrowLeft, ArrowRight, Equal, Ban, AlignLeft, Route } from "lucide-react";
import { PromptInput } from "@/components/agentui/prompt-input";
import { Button } from "@/components/agentui/button";
import { Message, MessageBubble, MessageBubbleContent, MessageTyping } from "@/components/agentui/message";
import { Answer } from "./answer";
import { TrajectoryComparison } from "./trajectory";
import { findSession, updateSession, useHistory } from "./history-store";
import { comparisonOf, FOLLOWUPS, TRAJECTORY_FOLLOWUPS, METHODS, messageText, type ArenaMessage, type Session, type Vote } from "@/lib/arena/types";
import { PATIENT_PROFILES, patientLabel } from "@/lib/arena/trajectory";

const votes = [
  { value: "a", label: "A is better", icon: ArrowLeft },
  { value: "both-good", label: "Both are good", icon: Equal },
  { value: "both-bad", label: "Both are bad", icon: Ban },
  { value: "b", label: "B is better", icon: ArrowRight },
] as const;


function Conversation({ session }: { session: Session }) {
  const [draft, setDraft] = useState("");
  const [initial] = useState(session);
  const [transport] = useState(() => new DefaultChatTransport<ArenaMessage>({ api: "/api/arena", body: {
    kind: session.kind, patientMode: session.patientMode, sharedPatientId: session.sharedPatientId,
  } }));
  const followups = session.kind === "trajectory" ? TRAJECTORY_FOLLOWUPS : FOLLOWUPS;
  const gate = useRef(false);
  const { messages, sendMessage, regenerate, stop, status, error, clearError } = useChat<ArenaMessage>({
    id: session.id, messages: initial.messages, transport,
    onFinish: ({ messages: finished, isAbort, isError }) => {
      gate.current = false;
      updateSession(session.id, { messages: finished, state: !isAbort && !isError && comparisonOf(finished.at(-1))?.complete ? "ready" : "interrupted" });
    },
    onError: () => { gate.current = false; updateSession(session.id, { state: "interrupted" }); },
  });
  const busy = status === "submitted" || status === "streaming";
  const lastComplete = !!comparisonOf(messages.at(-1))?.complete;
  const incomplete = messages.length > 0 ? !lastComplete : session.state !== "new";
  const firstReply = messages.find(m => m.role === "assistant");
  const restoredComparison = comparisonOf(initial.messages.find(message => message.role === "assistant"));
  const restoredStageCount = Math.min(...(restoredComparison?.answers.map(answer => answer.trajectory?.stages.length ?? 0) ?? [0]));
  const canVote = !!comparisonOf(firstReply)?.complete && !session.vote;
  const lastRoundRef = useRef<HTMLDivElement>(null);
  const userCount = messages.filter(m => m.role === "user").length;

  useEffect(() => { updateSession(session.id, { messages }); }, [messages, session.id]);
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted || findSession(session.id)?.state !== "new") return;
      updateSession(session.id, { state: "interrupted" });
      gate.current = true;
      void sendMessage({ text: initial.prompt });
    });
    return () => { mounted = false; void stop(); };
  }, [session.id, sendMessage, stop, initial.prompt]);
  useEffect(() => { lastRoundRef.current?.scrollIntoView({ block: "start", behavior: "instant" }); }, [userCount]);

  const send = (text: string) => {
    if (busy || gate.current || incomplete || !text.trim()) return;
    gate.current = true; clearError(); setDraft("");
    updateSession(session.id, { state: "interrupted" });
    void sendMessage({ text: text.trim() });
  };
  const retry = () => {
    if (busy || gate.current) return;
    gate.current = true; clearError();
    updateSession(session.id, { state: "interrupted" });
    if (!messages.length) void sendMessage({ text: session.prompt });
    else void regenerate();
  };
  const rounds = messages.filter(m => m.role === "user").map(user => {
    const index = messages.indexOf(user);
    const reply = messages[index + 1]?.role === "assistant" ? messages[index + 1] : undefined;
    return { user, reply };
  });
  return <div className="comparison-page agent-chat">
    <div className="comparison-heading"><h1>{session.title}</h1><span>Synthetic {session.kind === "trajectory" ? "patient trajectories" : "examples"} · AKI</span></div>
    <div className="comparison-rounds">
      {rounds.map(({ user, reply }, index) => {
        const comparison = comparisonOf(reply);
        return <section className="comparison-round" key={user.id} ref={index === rounds.length - 1 ? lastRoundRef : undefined}>
          <Message from="user" animateIn={!initial.messages.some(message => message.id === user.id)} className="agent-question">
            <MessageBubble><MessageBubbleContent>{messageText(user)}</MessageBubbleContent></MessageBubble>
          </Message>
          {session.kind === "trajectory" && index === 0 ? <TrajectoryComparison session={session} comparison={comparison} loading={busy && index === rounds.length - 1}
            initialStageCount={restoredStageCount} /> :
          <div className="answer-grid">{session.methods.map((method, slot) => <Answer key={method} label={`Assistant ${slot === 0 ? "A" : "B"}`}
            method={session.vote ? METHODS[method] : undefined} text={comparison?.answers.find(a => a.method === method)?.text ?? ""}
            loading={busy && index === rounds.length - 1} appearance="chat" animateIn={!initial.messages.some(message => message.id === reply?.id)} />)}</div>}
        </section>;
      })}
      {!rounds.length && busy && <MessageTyping label="Loading comparison…" />}
    </div>
    {!busy && (error || incomplete) && <div className="chat-error" role="alert"><span>{error ? "The example could not be loaded." : "This response was interrupted."} Your question is saved.</span><Button variant="outline" onClick={retry}>Retry response</Button></div>}
    <div className="followup-dock">
      {canVote && <div className="vote-bar" aria-label="Compare the first pair of answers">{votes.map(({ value, label, icon: Icon }) =>
        <Button variant="outline" key={value} onClick={() => updateSession(session.id, { vote: value as Vote })}><Icon size={15} />{label}</Button>)}</div>}
      {session.vote && <p className="vote-result" role="status"><Check size={14} />Vote saved: {votes.find(v => v.value === session.vote)?.label}. Methods revealed.</p>}
      <PromptInput value={draft} onValueChange={setDraft} onSubmit={send} onStop={() => { void stop(); }} loading={busy} disabled={incomplete}
        maxLength={6000} placeholder="Ask a follow-up…" leadingAction={<div className="agent-session-context" aria-label="Fixed session configuration">
          <span>{session.kind === "trajectory" ? <Route size={14} /> : <AlignLeft size={14} />}{session.kind === "trajectory" ? "Patient trajectory" : "Text"}</span>
          {session.kind === "trajectory" && <span>{session.patientMode === "shared" ? `Same patient · ${patientLabel(PATIENT_PROFILES[session.sharedPatientId])}` : "Two patients · 68-year-old man / 71-year-old woman"}</span>}
        </div>} />
      <div className="followup-suggestions">{followups.map(text => <Button variant="outline" key={text} disabled={busy || incomplete} onClick={() => send(text)}>{text}</Button>)}</div>
      <p className="prototype-note">{session.kind === "trajectory" ? "Authored synthetic courses and demonstration graph. No live model or graph queries." : "Authored examples, not live model outputs. No patient records are used."}</p>
    </div>
  </div>;
}
export function ArenaChat({ id }: { id: string }) {
  const { sessions, ready } = useHistory();
  if (!ready) return <div className="chat-empty"><MessageTyping label="Loading chat…" /></div>;
  const session = sessions.find(s => s.id === id);
  if (!session) return <div className="chat-empty"><h1>Chat not found</h1><p>This chat may have been deleted or saved in another browser.</p><Link className="agent-button agent-button-primary agent-button-sm" href="/">Start a comparison</Link></div>;
  return <Conversation key={id} session={session} />;
}
