"use client";

import { useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCheck, Clock3, Database, Info, Search, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { SNAPSHOTS, DIMENSIONS, rankedEntries, selectEntries, dailyUsage, summary, type BoardKind, type SortKey, type Snapshot } from "@/lib/leaderboard/data";

const number = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const dateLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function MetricInfo({ label, children }: { label: string; children: React.ReactNode }) {
  return <Tooltip content={<span className="lb-tooltip">{children}</span>}><button type="button" className="lb-info" aria-label={`About ${label}`}><Info size={13} /></button></Tooltip>;
}

function Usage({ snapshot }: { snapshot: Snapshot }) {
  const [days, setDays] = useState<7 | 30>(30);
  const reduced = useReducedMotion();
  const data = dailyUsage(snapshot, days);
  const total = data.reduce((sum, day) => sum + day.tokens, 0);
  return <section className="lb-chart-section" aria-labelledby="usage-title">
    <header className="lb-chart-header"><div><h2 id="usage-title">Token usage</h2><p>{dateLabel(data[0].date)} – {dateLabel(data.at(-1)!.date)}, 2026</p></div>
      <div className="lb-range" role="group" aria-label="Usage period">{([7, 30] as const).map(value => <Button key={value} size="compact" variant={days === value ? "secondary" : "ghost"} aria-pressed={days === value} onClick={() => setDays(value)}>{value} days</Button>)}</div>
    </header>
    <p className="lb-chart-total" aria-live="polite">{compact.format(total)} <span>tokens · input + output</span></p>
    <ChartContainer config={{ tokens: { label: "Tokens", color: "var(--foreground)" } }} className="lb-chart" aria-label={`Daily demo token usage over ${days} days`}>
      <BarChart data={data} accessibilityLayer margin={{ top: 14, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} minTickGap={25} tickMargin={12} />
        <YAxis tickFormatter={value => compact.format(value)} tickLine={false} axisLine={false} width={46} tickCount={4} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={label => dateLabel(String(label))} />} />
        <Bar dataKey="tokens" fill="var(--color-tokens)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={!reduced} animationDuration={250} />
      </BarChart>
    </ChartContainer>
    <details className="lb-chart-data"><summary>View daily values</summary><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Tokens</TableHead></TableRow></TableHeader><TableBody>{data.map(day => <TableRow key={day.date}><TableCell>{day.date}</TableCell><TableCell>{number.format(day.tokens)}</TableCell></TableRow>)}</TableBody></Table></details>
  </section>;
}

function Profile({ snapshot }: { snapshot: Snapshot }) {
  const entries = rankedEntries(snapshot);
  const [selected, setSelected] = useState<[string, string]>([entries[0].id, entries[1].id]);
  const reduced = useReducedMotion();
  const first = entries.find(entry => entry.id === selected[0])!;
  const second = entries.find(entry => entry.id === selected[1])!;
  const data = DIMENSIONS.map((dimension, i) => ({ dimension, first: first.profile[i], second: second.profile[i] }));
  return <section className="lb-chart-section" aria-labelledby="profile-title">
    <header className="lb-chart-header"><div><h2 id="profile-title">Capability profile</h2><p>Illustrative scores · 0–100</p></div><MetricInfo label="capability scores">Five independent demo dimensions, not scores derived from chat votes or clinical validation.</MetricInfo></header>
    <div className="lb-profile-selectors">{([first, second]).map((entry, i) => <label key={i}><span className={`lb-series lb-series-${i}`} />{snapshot.kind === "models" ? <select aria-label={`Compare model ${i + 1}`} value={entry.id} onChange={e => setSelected(previous => i === 0 ? [e.target.value, previous[1]] : [previous[0], e.target.value])}>{entries.map(option => <option key={option.id} value={option.id} disabled={option.id === selected[1 - i]}>{option.name}</option>)}</select> : <span>{entry.name}</span>}</label>)}</div>
    <ChartContainer className="lb-chart lb-radar" config={{ first: { label: first.name, color: "var(--profile-first)" }, second: { label: second.name, color: "var(--profile-second)" } }} aria-label={`Demo capability comparison: ${first.name} and ${second.name}`}>
      <RadarChart data={data} outerRadius="65%" accessibilityLayer>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
        <PolarRadiusAxis domain={[0, 100]} tickCount={3} axisLine={false} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(_label, payload) => String(payload[0]?.payload?.dimension ?? "")} />} />
        <Radar dataKey="first" stroke="var(--color-first)" fill="var(--color-first)" fillOpacity={.06} strokeWidth={2} isAnimationActive={!reduced} animationDuration={250} />
        <Radar dataKey="second" stroke="var(--color-second)" fill="var(--color-second)" fillOpacity={.04} strokeWidth={2} strokeDasharray="5 4" isAnimationActive={!reduced} animationDuration={250} />
      </RadarChart>
    </ChartContainer>
    <details className="lb-chart-data"><summary>View dimension scores</summary><Table><TableHeader><TableRow><TableHead>Dimension</TableHead><TableHead>{first.name}</TableHead><TableHead>{second.name}</TableHead></TableRow></TableHeader><TableBody>{data.map(row => <TableRow key={row.dimension}><TableCell>{row.dimension}</TableCell><TableCell>{row.first}</TableCell><TableCell>{row.second}</TableCell></TableRow>)}</TableBody></Table></details>
  </section>;
}

function Board({ snapshot }: { snapshot: Snapshot }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "elo", direction: "desc" });
  const rows = selectEntries(snapshot, query, sort.key, sort.direction);
  const reduced = useReducedMotion();
  const sortHeader = (key: SortKey, label: string, help?: string) => <TableHead className={key === "rank" ? "lb-rank" : "lb-numeric"} aria-sort={sort.key === key ? sort.direction === "asc" ? "ascending" : "descending" : "none"}>
    <div className="lb-column-label"><button type="button" onClick={() => setSort(previous => ({ key, direction: previous.key === key && previous.direction === "desc" ? "asc" : key === "rank" && previous.key !== key ? "asc" : "desc" }))} aria-label={`Sort by ${label}`}>{label}{sort.key === key ? sort.direction === "desc" ? <ArrowDown size={13} /> : <ArrowUp size={13} /> : <ArrowUpDown size={12} />}</button>{help && <MetricInfo label={label}>{help}</MetricInfo>}</div>
  </TableHead>;
  return <motion.div initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .18 }}>
    <div className="lb-table-toolbar"><p>{snapshot.kind === "models" ? "Model" : "Method"} rankings</p><div className="lb-search"><Search size={15} /><input aria-label="Search leaderboard" placeholder={snapshot.kind === "models" ? "Search models…" : "Search methods…"} value={query} onChange={e => setQuery(e.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}</div></div>
    <div className="lb-ranking-table"><Table><TableCaption className="sr-only">{snapshot.kind === "models" ? "Model" : "Method"} rankings. All values are fixed demo data.</TableCaption><TableHeader><TableRow>
      {sortHeader("rank", "Rank")}<TableHead>{snapshot.kind === "models" ? "Model" : "Method"}</TableHead>
      {sortHeader("elo", "Elo", "Illustrative Elo ratings. Higher scores indicate a stronger demo ranking; these are not live evaluation results.")}
      {sortHeader("winRate", "Win rate", "(Wins + 0.5 × ties) ÷ votes. Ties receive half a point; entries with no votes have no win rate.")}
      {sortHeader("votes", "Votes", "Votes involving this entry. Each head-to-head vote appears in two entries; the summary counts each vote once.")}
      {sortHeader("tokens", "Tokens", "Input and output tokens across the full 30-day demo snapshot.")}
    </TableRow></TableHeader><TableBody>{rows.map(entry => <TableRow key={entry.id}><TableCell className="lb-rank">{entry.rank.toString().padStart(2, "0")}</TableCell><TableCell><div className="lb-entry-name">{entry.name}</div><div className="lb-entry-subtitle">{entry.subtitle}</div></TableCell><TableCell className="lb-numeric lb-elo">{entry.elo}</TableCell><TableCell className="lb-numeric">{entry.winRate === null ? "—" : `${(entry.winRate * 100).toFixed(1)}%`}</TableCell><TableCell className="lb-numeric">{number.format(entry.votes)}</TableCell><TableCell className="lb-numeric" title={number.format(entry.tokens)}>{compact.format(entry.tokens)}</TableCell></TableRow>)}</TableBody></Table></div>
    {!rows.length && <div className="lb-empty" role="status"><p>No matching {snapshot.kind}.</p><Button variant="tertiary" onClick={() => setQuery("")}>Clear search</Button></div>}
    <div className="lb-table-note"><span>{rows.length} of {snapshot.entries.length} {snapshot.kind}</span><span>Demo snapshot · ranked by Elo</span></div>
    <div className="lb-charts"><Usage snapshot={snapshot} /><Profile snapshot={snapshot} /></div>
  </motion.div>;
}

export function Leaderboard() {
  const [kind, setKind] = useState<BoardKind>("models");
  const snapshot = SNAPSHOTS[kind];
  const totals = summary(snapshot);
  return <div className="leaderboard-page">
    <header className="lb-heading"><div className="lb-title-row"><h1>Leaderboard</h1><span className="lb-demo">Demo</span></div><p>Comparing models and methods for clinical case generation.</p><p className="lb-demo-note">Elo, usage and capability scores are illustrative. Not live evaluations.</p>
      <div className="lb-summary" aria-live="polite"><span><Clock3 size={14} />{dateLabel(snapshot.date)}, 2026</span><span><Database size={14} /><strong>{totals.count}</strong> {kind}</span><span><CheckCheck size={14} /><strong>{number.format(totals.votes)}</strong> votes</span><span><strong>{compact.format(totals.tokens)}</strong> tokens</span></div>
    </header>
    <Tabs.Root value={kind} onValueChange={value => { if (value === "models" || value === "methods") setKind(value); }}>
      <Tabs.List className="lb-tabs" aria-label="Leaderboard type"><Tabs.Tab value="models">Models</Tabs.Tab><Tabs.Tab value="methods">Methods</Tabs.Tab></Tabs.List>
      {(["models", "methods"] as const).map(value => <Tabs.Panel key={value} value={value}><Board key={value} snapshot={SNAPSHOTS[value]} /></Tabs.Panel>)}
    </Tabs.Root>
  </div>;
}
