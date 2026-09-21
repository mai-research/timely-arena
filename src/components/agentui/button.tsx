"use client";

// Adapted from AgentUI's Motion Button, distributed with Prompt Input:
// https://www.agentui.pro/components/agents/prompt-input
import { forwardRef } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING_PRESS } from "./motion";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = "primary", size = "sm", disabled, className, children, ...props
}, ref) {
  const reduce = useReducedMotion();
  return <motion.button ref={ref} type="button" disabled={disabled}
    whileTap={reduce || disabled ? undefined : { scale: 0.95 }} transition={SPRING_PRESS}
    className={cn("agent-button", `agent-button-${variant}`, `agent-button-${size}`, className)} {...props}>
    {children}
  </motion.button>;
});
