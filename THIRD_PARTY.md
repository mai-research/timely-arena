# Component sources

Fluid Functionalism sidebar and its referenced utilities/styles were retrieved from https://www.fluidfunctionalism.com/r/sidebar.json on 2026-09-07. Source components live in `src/components/ui`, `src/hooks`, and the related `src/lib` files; registry CSS lives in `src/app/fluid.css`. Motion imports use `motion/react` instead of `framer-motion`. The upstream MIT copyright and permission notice is included at `licenses/Fluid-Functionalism-MIT.txt`.

The title canvas selects one animation per visit from adaptations of the user-supplied FloodType and BondType implementations, confirmed by the project owner as MIT licensed on 2026-09-21. Their shared global timeline is driven by Motion's `useAnimationFrame`. BondType uses the self-hosted Silkscreen pixel font, resamples the supplied poses for TIMELY / ARENA, and keeps adjacent-letter bonds within each word.

Pretext (`@chenglou/pretext`) measures the reusable `OutputText` component. The current composer uses AgentUI's native-textarea measurement mirror. No model output is generated on this landing page.

Local compatibility changes: recursive proximity measurement uses a named callback; an intentionally unused scroll prop is explicitly consumed; the mobile dialog restores focus to its opener. React Compiler lint exceptions are scoped to the imported sidebar/tooltip files, whose imperative ref patterns are retained. Standard hook rules remain enabled.

AgentUI Prompt Input, its bundled Motion Button/Select styles and motion tokens, and Message/MessageBubble/MessageTyping were read from the public source panels on 2026-09-08: https://www.agentui.pro/components/agents/prompt-input, https://www.agentui.pro/components/agents/message and https://www.agentui.pro/components/agents/message-bubble. Focused adaptations live in `src/components/agentui`, with palette and responsive rules in `src/app/chat-ui.css`. The composer is controlled, supports a read-only preset and caller-provided toolbar, and binds sending/stopping to the existing AI SDK lifecycle. The measurement mirror shares textarea font metrics; IME submission is guarded. Buttons retain press and send/stop transitions; messages animate on new mounts only, and all motion honors reduced motion. Optional gallery actions, models, ripples, avatars and scrollers are omitted. The Select appearance is adapted over the already-installed Base UI Select (https://base-ui.com/react/components/select) to provide arrow-key navigation, typeahead, Escape, focus restoration and collision-aware portals. The previous Fluid InputMessage/FileThumbnail and Beautiful UI composer have been removed; their other shared components remain in use.

AI SDK (`ai`, `@ai-sdk/react`) supplies the chat lifecycle and typed custom-data stream. The API streams authored fixture text only; no provider credentials, real records, or graph service are used. Sidebar history follows the user-supplied Fluid composition, with browser-local storage and rename/delete dialogs.

Fluid Base sidebar wrapper was retrieved from https://www.fluidfunctionalism.com/r/base/sidebar.json, and the Radix Dropdown/MenuItem, Elevated, and Dialog from their Fluid registry entries on 2026-09-07. The shared sidebar core/menu modules and existing utilities are retained. Motion imports map to `motion/react`; registry menu-item imports map locally. DropdownContent exposes Radix's onCloseAutoFocus so menu-to-dialog transitions do not steal input focus. Imported dialog/dropdown/menu-item code uses the existing scoped React Compiler lint compatibility exceptions. Application handlers retain full lint checks.

Leaderboard Chart and Table source was retrieved from the shadcn Base Nova registry on 2026-09-07: https://ui.shadcn.com/r/styles/base-nova/chart.json and https://ui.shadcn.com/r/styles/base-nova/table.json (upstream: https://github.com/shadcn-ui/ui, MIT). Source lives in `src/components/ui/chart.tsx` and `table.tsx`; the registry's `cn` import maps to the existing local utility. Chart uses Recharts 3. The page composes the bar and radar primitives with the shadcn chart container and tooltip, adapting the examples at https://ui.shadcn.com/charts/bar and https://ui.shadcn.com/charts/radar to neutral surfaces with blue/orange radar accents. Existing Fluid components are retained. All leaderboard scores and usage are authored demo fixtures; the real model names do not imply measured evaluations or endorsement.

Admin battle prompts and answers reuse the AgentUI Message/MessageBubble and chat Answer components. Project-owned execution messages compose these primitives with keyboard-accessible disclosures for mock tool parameters, results, errors and durations. Step summaries and graph-node links remain available through execution details. All call IDs and data come from authored fixtures; no live tool execution is introduced. The former Beautiful UI ThinkingState and ToolChips adaptations have been removed; their MIT notice is retained for attribution of earlier revisions. The condition graph uses project-owned Canvas/HTML interaction based on the local AKI `viz.html` as a reference, with deterministic offline positions instead of live force simulation. It is not the Beautiful UI workflow editor. The external AKI graph and its paper/guideline evidence have been removed from the public release. `synthetic-demo.json` is an independently authored UI fixture with one synthetic source; it does not import the original graph or publication text. No graph-construction logs or incomplete query logs are represented as battle traces. All reasoning summaries and tool events are authored fictional fixtures.

Battle exploration rendering uses `react-force-graph-2d` (MIT), https://github.com/vasturiano/react-force-graph. It is loaded only when a battle inspector opens. Node/link objects are detached from the snapshot because the library resolves endpoints in place. The displayed graph is restricted to the current timeline prefix; no full graph is rendered on the Admin main page.


## License inventory and scope

The root MIT license applies to project-authored contributions and synthetic fixtures. It does not relicense upstream code, fonts, supplied artwork or animations. Dependency licenses remain in their installed packages; `package-lock.json` pins the dependency tree.

| Material | Local paths | License / permission status |
| --- | --- | --- |
| Fluid Functionalism | `src/components/ui`, `src/hooks`, shared utilities, `src/app/fluid.css` | MIT; full upstream notice in `licenses/Fluid-Functionalism-MIT.txt` |
| shadcn/ui chart and table | `src/components/ui/chart.tsx`, `table.tsx` | MIT; full upstream notice in `licenses/shadcn-ui-MIT.txt` |
| Former Beautiful UI adaptations | Removed ThinkingState / ToolChips components | MIT notice retained in `src/components/beautiful/LICENSE` for earlier revisions |
| AgentUI adaptations | `src/components/agentui`, related chat styles | MIT; verified upstream `ashish200729/agentui`. Full copyright and permission notice in `licenses/AgentUI-MIT.txt`. |
| Supplied FloodType / BondType animations | `src/lib/flood-type`, `src/lib/bond-type` | MIT, confirmed by the project owner on 2026-09-21. Upstream repository/author notice still needs to be recorded; no author attribution is invented here. |
| Supplied project favicon | `public/favicon.svg` | Original artwork by the project owner, confirmed on 2026-09-21; covered by the project MIT license. |
| Inter / Silkscreen via Fontsource | `@fontsource-variable/inter`, `@fontsource/silkscreen` | SIL OFL 1.1; retain notices distributed with the packages. |
| Synthetic demonstration graph | `src/lib/admin/snapshots/synthetic-demo.json`, `scripts/generate-demo-graph.py` | Project-authored, MIT; no clinical source quotations or external graph data. |

Upstream MIT notices were retrieved on 2026-09-21 from https://github.com/mickadesign/fluid-functionalism/blob/main/LICENSE and https://github.com/shadcn-ui/ui/blob/main/LICENSE.md. AgentUI is separately covered by its upstream MIT notice below. Preserve each upstream copyright and permission notice; the root project license does not replace those notices.

The public branch excludes Patient Iris and its Cosmograph dependency. If that feature is later ported, review its CC BY-NC 4.0 / commercial licensing separately: https://cosmograph.app/licensing/. Never merge the old feature branch into the public branch without first removing its private graph history.


### AgentUI upstream verification (2026-09-21)

Verified repository: https://github.com/ashish200729/agentui. Its homepage and README point to `agentui.pro`, and the repository contains the imported `components/agents/prompt-input.tsx`, `message.tsx` and `message-bubble.tsx` component families. This identifies the relevant upstream rather than another project with the same name.

License checked at upstream commit `116726c95a9325fe3a340bd9c94ae6edefb945f6`: https://github.com/ashish200729/agentui/blob/116726c95a9325fe3a340bd9c94ae6edefb945f6/LICENSE. MIT, copyright (c) 2026 Saurabh Chauhan. A complete copy is retained in `licenses/AgentUI-MIT.txt`. Redistribution of copies or substantial portions must include the upstream copyright and permission notice. The license permits modification and commercial use; retain its warranty disclaimer as part of the full notice. This is the current upstream license check, not a claim that the local adaptations exactly match that revision.
