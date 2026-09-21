import type { UIMessage } from "ai";
import type { PatientTrajectory } from "./trajectory";

export type Method = "llm" | "graph";
export type PatientId = "patient-68m" | "patient-71f";
export type ChatConfig =
  | { kind: "text"; patientMode?: never; sharedPatientId?: never }
  | { kind: "trajectory"; patientMode: "paired"; sharedPatientId?: never }
  | { kind: "trajectory"; patientMode: "shared"; sharedPatientId: PatientId };
export type ComparisonAnswer = { method: Method; text: string; trajectory?: PatientTrajectory };
export type Comparison = { answers: ComparisonAnswer[]; complete: boolean };
export type ArenaMessage = UIMessage<never, { comparison: Comparison }>;
export type Vote = "a" | "both-good" | "both-bad" | "b";
export type Session = ChatConfig & {
  id: string; title: string; createdAt: number; updatedAt: number; prompt: string;
  methods: [Method, Method]; messages: ArenaMessage[]; vote?: Vote;
  state: "new" | "ready" | "interrupted";
};
export const METHODS = { llm: "LLM synthetic", graph: "Graph-query synthetic" } as const;
export const FOLLOWUPS = ["Explain the key clues", "Compare the lab findings", "Make the cases shorter"];
export const TRAJECTORY_FOLLOWUPS = ["Explain the key changes", "Compare readings over time", "Summarize the trajectory"];
export const messageText = (message: ArenaMessage) => message.parts.filter(part => part.type === "text").map(part => part.text).join("");
export const comparisonOf = (message?: ArenaMessage) => message?.parts.find(part => part.type === "data-comparison")?.data;

// Missing kind is the original text-only API/history format.
export function readChatConfig(value: unknown): ChatConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const c = value as Record<string, unknown>;
  if ((c.kind === undefined || c.kind === "text") && c.patientMode === undefined && c.sharedPatientId === undefined) return { kind: "text" };
  if (c.kind !== "trajectory") return null;
  if (c.patientMode === "paired" && c.sharedPatientId === undefined) return { kind: "trajectory", patientMode: "paired" };
  if (c.patientMode === "shared" && (c.sharedPatientId === "patient-68m" || c.sharedPatientId === "patient-71f")) {
    return { kind: "trajectory", patientMode: "shared", sharedPatientId: c.sharedPatientId };
  }
  return null;
}
