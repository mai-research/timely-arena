import { comparisonOf, readChatConfig, type ChatConfig, type Session, type ArenaMessage, type ComparisonAnswer } from "./types";
import { validTrajectory, trajectoryText } from "./trajectory";

export const HISTORY_KEY = "timely-arena.chats.v1";

function validMessage(value: unknown, config: ChatConfig): value is ArenaMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  if (typeof m.id !== "string" || !["user", "assistant"].includes(String(m.role)) || !Array.isArray(m.parts)) return false;
  return m.parts.every(p => {
    if (!p || typeof p !== "object") return false;
    if (p.type === "text") return typeof p.text === "string";
    if (p.type !== "data-comparison") return false;
    const d = p.data;
    return d && typeof d.complete === "boolean" && Array.isArray(d.answers) && d.answers.length === 2 &&
      new Set(d.answers.map((a: { method?: string }) => a?.method)).size === 2 &&
      d.answers.every((a: ComparisonAnswer) => {
        if (!a || !["llm", "graph"].includes(a.method) || typeof a.text !== "string") return false;
        if (a.trajectory === undefined) return d.answers.every((other: ComparisonAnswer) => other?.trajectory === undefined);
        if (config.kind !== "trajectory" || !validTrajectory(a.trajectory, d.complete)) return false;
        const expected = config.patientMode === "shared" ? config.sharedPatientId : a.method === "llm" ? "patient-68m" : "patient-71f";
        return a.trajectory.profile.id === expected && a.text === trajectoryText(a.trajectory) &&
          d.answers.every((other: ComparisonAnswer) => other?.trajectory?.stages?.length === a.trajectory!.stages.length);
      });
  });
}

export function decodeHistory(raw: string | null): Session[] {
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Invalid history");
  return value.filter((s): s is Session => s && readChatConfig(s) && typeof s.id === "string" && typeof s.title === "string" &&
    typeof s.prompt === "string" && Number.isFinite(s.createdAt) && Number.isFinite(s.updatedAt) &&
    Array.isArray(s.methods) && s.methods.length === 2 && s.methods.includes("llm") && s.methods.includes("graph") &&
    Array.isArray(s.messages) && s.messages.every((m: unknown) => validMessage(m, readChatConfig(s)!)) && ["new", "ready", "interrupted"].includes(s.state) &&
    (s.vote === undefined || ["a", "b", "both-good", "both-bad"].includes(s.vote)))
    .filter(s => {
      if (s.kind !== "trajectory") return true;
      const first = comparisonOf(s.messages.find(m => m.role === "assistant"));
      return !first || first.answers.every(a => a.trajectory !== undefined);
    })
    .map(s => {
      const { kind, patientMode, sharedPatientId, ...session } = s;
      return { ...session, ...readChatConfig({ kind, patientMode, sharedPatientId })!, state: s.state === "new" ? "interrupted" as const : s.state };
    });
}

export function newSession(prompt: string, random = Math.random(), config: ChatConfig = { kind: "text" }): Session {
  const now = Date.now();
  return { ...config, id: crypto.randomUUID(), title: config.kind === "trajectory" ? `AKI trajectory · ${config.patientMode === "shared" ? "same patient" : "two patients"}` : "AKI case comparison", createdAt: now, updatedAt: now, prompt,
    methods: random < 0.5 ? ["llm", "graph"] : ["graph", "llm"], messages: [], state: "new" };
}
