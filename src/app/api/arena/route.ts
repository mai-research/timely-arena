import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { fixtureAnswers } from "@/lib/arena/fixtures";
import { trajectoryAnswers, trajectoryFollowup } from "@/lib/arena/trajectory-fixtures";
import { STAGES, trajectoryText } from "@/lib/arena/trajectory";
import { readChatConfig, type ArenaMessage, type ComparisonAnswer } from "@/lib/arena/types";

export async function POST(request: Request) {
  let body;
  try { body = await request.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
  const config = readChatConfig(body);
  if (!config) return new Response("Invalid chat configuration", { status: 400 });
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length > 100) return new Response("Invalid conversation", { status: 400 });
  const users = messages.filter(m => m?.role === "user");
  const parts = users.at(-1)?.parts;
  if (!Array.isArray(parts)) return new Response("A prompt is required", { status: 400 });
  const prompt = parts.filter(p => p?.type === "text" && typeof p.text === "string").map(p => p.text).join("");
  if (!prompt.trim() || prompt.length > 6000) return new Response("Prompt must be 1–6000 characters", { status: 400 });
  const first = users.length === 1;
  const isTrajectory = config.kind === "trajectory" && first;
  const answers: ComparisonAnswer[] = config.kind === "trajectory"
    ? first ? trajectoryAnswers(config) : trajectoryFollowup(prompt, config)
    : fixtureAnswers(prompt, first);
  const stream = createUIMessageStream<ArenaMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      if (isTrajectory) {
        for (let count = 0; count <= STAGES.length; count++) {
          if (request.signal.aborted) return;
          const complete = count === STAGES.length;
          writer.write({ type: "data-comparison", id: "comparison", data: {
            answers: answers.map(a => {
              const trajectory = { ...a.trajectory!, stages: a.trajectory!.stages.slice(0, count) };
              return { method: a.method, trajectory, text: trajectoryText(trajectory) };
            }), complete,
          } });
          if (!complete) await new Promise(resolve => setTimeout(resolve, 240));
        }
        writer.write({ type: "finish" });
        return;
      }
      const maxLength = Math.max(...answers.map(a => a.text.length));
      for (let length = 0; length < maxLength + 45; length += 45) {
        if (request.signal.aborted) return;
        const complete = length >= maxLength;
        writer.write({ type: "data-comparison", id: "comparison", data: { answers: answers.map(a => ({ ...a, text: a.text.slice(0, length) })), complete } });
        if (!complete) await new Promise(resolve => setTimeout(resolve, 60));
      }
      writer.write({ type: "finish" });
    },
    onError: () => "Unable to load the example. Please retry.",
  });
  return createUIMessageStreamResponse({ stream });
}
