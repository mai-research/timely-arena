"use client";

// Focused adaptations of AgentUI Message, MessageBubble and MessageTyping.
// https://www.agentui.pro/components/agents/message
// https://www.agentui.pro/components/agents/message-bubble
import { createContext, useContext, type ComponentPropsWithRef } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { EASE_OUT, MESSAGE_POP_UP } from "./motion";

const MessageSideContext = createContext<"start" | "end">("start");
const BubbleContext = createContext<"soft" | "outline" | "ghost">("soft");

export function Message({ from, animateIn = false, className, children, ...props }: HTMLMotionProps<"article"> & {
  from: "user" | "assistant";
  animateIn?: boolean;
}) {
  const reduce = useReducedMotion();
  return <MessageSideContext.Provider value={from === "user" ? "end" : "start"}>
    <motion.article data-slot="message" data-from={from} aria-label={`${from} message`}
      initial={animateIn && !reduce ? { opacity: 0, y: 8, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }} transition={reduce ? { duration: 0 } : MESSAGE_POP_UP}
      style={{ transformOrigin: from === "user" ? "100% 100%" : "0% 100%" }}
      className={cn("agent-message", className)} {...props}>{children}</motion.article>
  </MessageSideContext.Provider>;
}

export function MessageBubble({ variant = "soft", children, className, ...props }: ComponentPropsWithRef<"div"> & {
  variant?: "soft" | "outline" | "ghost";
}) {
  const align = useContext(MessageSideContext);
  return <BubbleContext.Provider value={variant}>
    <div data-slot="message-bubble" data-align={align} className={cn("agent-bubble", className)} {...props}>{children}</div>
  </BubbleContext.Provider>;
}

export function MessageBubbleContent({ className, ...props }: ComponentPropsWithRef<"div">) {
  const variant = useContext(BubbleContext);
  return <div data-slot="message-bubble-content" className={cn("agent-bubble-content", `agent-bubble-${variant}`, className)} {...props} />;
}

export function MessageTyping({ label = "Loading example…", className, ...props }: ComponentPropsWithRef<"span"> & { label?: string }) {
  const reduce = useReducedMotion();
  return <span role="status" className={cn("agent-typing", className)} {...props}>
    <span aria-hidden="true" className="agent-typing-dots">{[0, 1, 2].map(index => <motion.span key={index}
      animate={reduce ? { opacity: 0.45, y: 0 } : { opacity: [0.28, 0.85, 0.28], y: [0, -2, 0] }}
      transition={reduce ? { duration: 0 } : { duration: 1.05, ease: EASE_OUT, repeat: Infinity, delay: index * 0.14 }} />)}</span>
    <span>{label}</span>
  </span>;
}
