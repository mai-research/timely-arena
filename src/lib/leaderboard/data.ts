export type BoardKind = "models" | "methods";
export type DailyUsage = { date: string; tokens: number };
export const DIMENSIONS = ["Clinical realism", "Consistency", "Completeness", "Instruction following", "Case diversity"] as const;
export type Entry = {
  id: string; name: string; subtitle: string; elo: number;
  wins: number; losses: number; ties: number;
  profile: [number, number, number, number, number];
  dailyUsage: DailyUsage[];
};
export type Snapshot = { kind: BoardKind; date: string; entries: Entry[] };
export type SortKey = "rank" | "elo" | "winRate" | "votes" | "tokens";
export type RankedEntry = Entry & { rank: number; votes: number; tokens: number; winRate: number | null };

// Authored demo fixtures. Elo and profile scores are illustrative, not measured.
const DATE = "2026-09-06";
function usage(seed: number): DailyUsage[] {
  return Array.from({ length: 30 }, (_, day) => ({
    date: new Date(Date.UTC(2026, 7, 8 + day)).toISOString().slice(0, 10),
    tokens: (seed * 83 + day * 29 + ((day * 7 + seed) % 11) * 113) * 100,
  }));
}
type Definition = [string, string, string, number, Entry["profile"]];
function entries(definitions: Definition[]): Entry[] {
  const result = definitions.map(([id, name, subtitle, elo, profile], i) => ({
    id, name, subtitle, elo, profile, wins: 0, losses: 0, ties: 0, dailyUsage: usage(14 + i * 5),
  }));
  // Each fictional match contributes once to both participants' records.
  for (let i = 0; i < result.length; i++) for (let j = i + 1; j < result.length; j++) {
    const wins = 260 + (j - i) * 31, losses = 170 + i * 17, ties = 48 + j * 6;
    result[i].wins += wins; result[i].losses += losses; result[i].ties += ties;
    result[j].wins += losses; result[j].losses += wins; result[j].ties += ties;
  }
  return result;
}
export const SNAPSHOTS: Record<BoardKind, Snapshot> = {
  models: { kind: "models", date: DATE, entries: entries([
    ["claude-opus-5", "Claude Opus 5", "Anthropic", 1284, [92, 89, 87, 94, 78]],
    ["gpt-5-6-sol", "GPT-5.6 Sol", "OpenAI", 1261, [88, 93, 91, 90, 83]],
    ["gemini-3-8-flash", "Gemini 3.8 Flash", "Google", 1238, [86, 84, 93, 86, 89]],
    ["deepseek-v4-pro", "DeepSeek V4 Pro", "DeepSeek", 1215, [85, 88, 82, 87, 81]],
    ["qwen-3-8-max", "Qwen3.8 Max", "Alibaba", 1197, [82, 83, 89, 84, 86]],
    ["kimi-k3", "Kimi K3", "Moonshot AI", 1182, [84, 81, 85, 82, 91]],
  ]) },
  methods: { kind: "methods", date: DATE, entries: entries([
    ["graph", "Graph-query synthetic", "Agent-guided graph synthesis", 1256, [93, 95, 90, 87, 80]],
    ["llm", "LLM synthetic", "Direct language-model synthesis", 1204, [85, 83, 88, 92, 94]],
  ]) },
};
export function rankedEntries(snapshot: Snapshot): RankedEntry[] {
  let rank = 1;
  return [...snapshot.entries].sort((a, b) => b.elo - a.elo || a.id.localeCompare(b.id)).map((entry, i, sorted) => {
    if (i && sorted[i - 1].elo !== entry.elo) rank = i + 1;
    const votes = entry.wins + entry.losses + entry.ties;
    return { ...entry, rank, votes, tokens: entry.dailyUsage.reduce((sum, day) => sum + day.tokens, 0), winRate: votes ? (entry.wins + entry.ties * .5) / votes : null };
  });
}
export function selectEntries(snapshot: Snapshot, query: string, key: SortKey, direction: "asc" | "desc") {
  const text = query.trim().toLowerCase();
  return rankedEntries(snapshot).filter(entry => `${entry.name} ${entry.subtitle}`.toLowerCase().includes(text)).sort((a, b) => {
    const left = a[key], right = b[key];
    if (left === null || right === null) return left === right ? a.rank - b.rank : left === null ? 1 : -1;
    return (left - right) * (direction === "asc" ? 1 : -1) || a.rank - b.rank;
  });
}
export function dailyUsage(snapshot: Snapshot, days: 7 | 30): DailyUsage[] {
  const buckets = new Map<string, number>();
  for (const entry of snapshot.entries) for (const day of entry.dailyUsage) buckets.set(day.date, (buckets.get(day.date) ?? 0) + day.tokens);
  return [...buckets].sort(([a], [b]) => a.localeCompare(b)).slice(-days).map(([date, tokens]) => ({ date, tokens }));
}
export function summary(snapshot: Snapshot) {
  const rows = rankedEntries(snapshot);
  return { count: rows.length, votes: rows.reduce((sum, row) => sum + row.votes, 0) / 2, tokens: rows.reduce((sum, row) => sum + row.tokens, 0) };
}
