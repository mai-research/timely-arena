# timely arena

Next.js AKI comparison prototype with a Fluid Functionalism sidebar, AgentUI chat components, AI SDK streaming, and Pretext output-text measurement.

```sh
npm install
npm run dev
```

Open http://localhost:3000. In environments that restrict Turbopack's local port binding, use `npm run dev -- --webpack`.

```sh
npm run lint
npm test
npm run build -- --webpack
```

- Choose **Text** or **Patient trajectory** on the homepage to create an independent chat. Each chat randomly assigns the two methods to A/B; the first vote reveals their names.
- Text follow-ups support key clues, lab comparison, and shorter cases. Other prompts receive an explicit prototype-scope response. All responses are authored synthetic fixtures streamed through `/api/arena`; no model, graph, or patient-data service is connected.
- Search, rename, and delete chats in the sidebar. History and votes are stored only in this browser under `timely-arena.chats.v1`. There is no account or cross-device sync. Stopped or interrupted responses can be retried without duplicating the question.
- Anonymity is a UI prototype behavior, not a secure blinded-study backend: method identifiers are present in local data.
- `src/components/agentui` provides the shared auto-growing composer, message bubbles, buttons and loading states, adapted from AgentUI. The landing toolbar holds chat type and patient choices; session settings become fixed after creation. Select menus use the existing Base UI primitives for keyboard navigation, focus restoration and positioning. `src/components/arena/pretext-text.tsx` provides reusable output-text measurement.
- The title randomly selects the flood or pixel-letter bond animation on page entry and loops that style for the visit. Both use black lettering on white. It can be paused, respects reduced motion, and stops updating while hidden or offscreen.
- Inter and Silkscreen are self-hosted. The favicon is the supplied project asset.
- See `THIRD_PARTY.md` for imported component sources and local adaptations.

## Cloudflare Workers

Use Node.js 22 or newer. The Workers build uses vinext (currently beta), pinned in the lockfile; the original Next.js development and build commands remain available.

In the Cloudflare **Workers** Git integration for `mai-research/timely-arena`, select `main` and set:

| Setting | Value |
| --- | --- |
| Project / Worker name | `timely-arena` |
| Root directory | repository root |
| Build command | `npm run build:vinext` |
| Deploy command | `npm run deploy:vinext` |

This is a server-rendered Worker with static assets, not a Pages static export. The generated `dist/server/wrangler.json` is used for deployment. No database, KV, AI API key, or account ID is required in the repository. Cloudflare's Git integration handles deployment credentials. Disable builds for non-production branches unless you need previews.

```sh
npm ci
npm run build:vinext
npm run start:vinext
# Deploy manually only after authenticating with Cloudflare:
npm run deploy:vinext
```

`wrangler.jsonc` enables the synthetic Admin demo with `ADMIN_DEMO_ENABLED=true`; `/admin` remains accessible by direct URL with no navigation entry or login. Change this variable to `false` in that file and rebuild/redeploy to disable it. This is a demo switch, not authentication. Local Next.js still uses the environment variable described below.

Worker state, build output, and `.dev.vars*` files are ignored. Keep credentials in Cloudflare secrets, never in Wrangler configuration. Chat history remains browser-local; deployments do not create shared user storage.

## Patient trajectories

Trajectory chats offer **Same patient** (choose the existing 68-year-old man or 71-year-old woman) and **Two patients** (the original pair). Shared-patient comparisons hold age, sex, medical history and medication background fixed while allowing different readings and courses. The chat type, patient setup and A/B assignment stay fixed after creation.

Five phases run from baseline through symptom onset, presentation, reassessment and recovery/follow-up. These are chronological phases, not sequential AKI severity stages. Each phase compares conditions, events, readings with units, and expandable examination/urinalysis details. Missing readings remain explicitly unrecorded. Desktop rows align A/B by phase, with each course's own time labels; mobile shows A then B within each phase. Copy and expand include the full trajectory. Fixed follow-ups explain changes, compare readings over time or summarize the same course.

`src/lib/arena/trajectory-fixtures.ts` contains four deterministic authored synthetic courses. Each course references the public synthetic demonstration graph for UI provenance only; these associations are not clinical evidence or guideline validation. Numerical readings, event times and recovery courses are fictional. Both method labels are simulated demo candidates, not live generator outputs or evidence of comparative clinical performance.

`POST /api/arena` accepts `kind: "text" | "trajectory"`. Trajectories require `patientMode: "shared" | "paired"`; shared mode also requires `sharedPatientId: "patient-68m" | "patient-71f"`. Omitted kind preserves the legacy text API. Initial trajectories stream whole-stage prefixes in `data-comparison`; only the final five-stage pair is complete. Follow-ups stream text from the same fixtures. Browser history retains the existing storage key, reads older chats as Text, and validates complete and interrupted trajectory payloads. No graph database, live query service or model provider is needed.

## Leaderboard

`/leaderboard` provides separate Models and Methods demo rankings with search, numeric sorting, daily token usage (7/30 days), and two-entry capability comparisons. Rank always refers to the full Elo snapshot, even when searching or sorting another column. The snapshot is fixed at 2026-09-06; all Elo and capability scores are illustrative. Pairwise records determine win rates (ties count as half a win), and summary votes count each match once. Token totals reconcile with the daily buckets. Switching the usage period only changes that chart, not the ranking snapshot.

Leaderboard fixtures are independent of browser-local chats and votes. No live evaluation, model provider, patient-data source, or token-metering API is connected. Model scores cannot be interpreted as actual clinical performance. Chart values are also available as expandable tables, and animations respect reduced motion.

## Researcher admin demo

Admin has no public navigation entry. Open `/admin` directly to access the demo. Set `ADMIN_DEMO_ENABLED=true` in the server environment (or `.env.local` for local development) and restart the server to enable it. Default is disabled; both `/admin` and `/admin/runs/[id]` return 404 when disabled. Anyone with the URL can access it when enabled. Hiding the navigation entry and this demo switch do not provide authentication or administrator authorization.

The read-only researcher workspace has Exploration and Battles views. URL filters preserve experiment, model, method, status, result, search, sort and node exploration context when opening details. Battles are paginated in groups of 25. Group comparisons use model × method within a fixed experiment / prompt set / graph version. Win/loss/tie totals count candidates once per battle; frequency and median steps/calls count candidate executions (one per turn).

The two curated battles show a two-turn graph exploration comparison and a single-pass LLM/graph comparison with a recovered evidence-query timeout. Each trace has a specific purpose, named node references, source evidence, and case-preservation checks. Failed attempts and retries keep separate call IDs. Single pass means one user prompt, not one agent query. Candidate mappings, outputs, statuses and timestamps are fixed. Battles use the same AgentUI message cells as chats. Compact mock tool calls appear before each final answer, with expandable parameters, results, errors and durations. Step summaries and node links remain available through execution details; the inspector starts collapsed and has independent A/B turn and step cursors, cumulative prefixes, and no playback. Query and return events are separate. Missing traces or non-graph methods are N/A, and mismatched graph versions do not contribute to coverage.

`src/lib/admin/snapshots/synthetic-demo.json` contains 19 project-authored concept nodes, 18 synthetic associations and one synthetic source, with deterministic positions and a content hash. No original AKI graph, paper excerpts, guideline quotations, OMOP mappings or external source files are bundled. Regenerate it with `python3 scripts/generate-demo-graph.py`. It exists solely to demonstrate graph inspection, parallel edges, timeline prefixes and coverage; it is not a clinical knowledge base. Battle summaries and tool events are authored fixtures.

Coverage is unique actively queried nodes / all 19 synthetic snapshot nodes. Node type filters affect display and show an additional type-specific fraction; returned-only nodes do not increase coverage. Node frequency is executions querying a node / executions with a usable graph trace. The Admin main page shows cohort statistics without a graph. Each battle has a react-force-graph-2d inspector showing only nodes explored through the selected turn and step; returned candidates are optional. The graph and keyboard node list share selection, evidence and sources. Graph relations are dashed; recorded traversals are solid. Snapshot positions stay fixed across timeline changes.

`npm test` covers graph integrity, trace prefixes and rewind, normalization, missing/failed records, filters and a 2,400-battle aggregation probe in addition to arena and leaderboard tests.

## Appearance

The sidebar includes a keyboard-accessible Dark mode switch. The initial theme follows the system preference; an explicit choice is saved in browser storage and synchronized between tabs. The theme is applied before first paint, including direct visits and refreshes. If browser storage is blocked, switching still works for the current visit. Both title animations, charts, graph nodes, forms and Fluid dialogs share the light/dark palette.


## License and public release

Project-authored code and synthetic fixtures are MIT licensed; see `LICENSE`. Third-party portions retain their own terms. See `THIRD_PARTY.md` for notices and outstanding permission checks. The MIT license does not grant rights to third-party material beyond its existing terms.

Only publish the reviewed `codex/public-release` branch, which starts with a fresh root commit. Older local branches and stashes retain private graph history for recovery and must not be pushed. Do not use `git push --all` or `git push --mirror`. Entire checkpoint refs and local agent directories must stay local; ignoring files does not remove them from existing history. Before any explicit push, run `python3 scripts/check-public-history.py codex/public-release`. This validates the complete ancestry of the selected ref, not only its current files. The tracked `.githooks/pre-push` validates every pushed ref and never invokes Entire. Enable it in each clone with `git config core.hooksPath .githooks`; it is enabled in this working repository. Entire is also disabled locally (`entire disable --local`) to prevent its integration from reinstalling an auto-upload hook. Do not bypass it with `--no-verify`. No remote is configured by this change.
