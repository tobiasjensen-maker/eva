# EVA — Agentic Accounting Platform (prototype)

> **Live:** https://e-conomic.design/tobiasjensen-maker/agentic-platform/
> **Hosted at:** e-conomic/eco-prototypes · prototypes/tobiasjensen-maker/agentic-platform/
> **Published:** 2026-09-28

An interactive prototype of **EVA**, e-conomic's agentic accounting Virtual Assistant.
It shows how an accountant/bookkeeper works *with* an AI agent that runs the recurring
bookkeeping jobs, surfaces what needs a human, and can be extended with third-party systems.

**Live:** https://e-conomic.design/tobiasjensen-maker/agentic-platform/

## What it is

A single-page app (hash routing) that mocks a full agentic product surface. All data is
**mock/placeholder** — there is no backend in the hosted build.

Primary navigation (the mental model) — five rail items. **The Portfolio overview is where
the day starts; every other page is "further in".**

- **Portfolio overview** (`src/views/OverviewView.tsx`, `#/home`, also `#/portfolio`,
  `#/clients`) — Home and Clients merged, modelled on Intuit Accountant Suite's home. **Scoped to the
  logged-in accountant's own portfolio (40 clients) — the whole office lives under Practice.**
  A greeting, a **question box
  with suggestion chips** that hands off to the EVA panel (answer included; the panel starts
  closed here and opens when you ask), then the day at a glance — **My tasks** (a shortcut into Work: your plate + what EVA is doing), **Ready for your review** (the same decisions as Work's review lane — see below) and
  **Books status** (where your 40 clients' books stand) — then **Clients who need your
  expertise** (with show-work) and **My clients** — your whole book of 40 (`MY_PORTFOLIO` in `practice.ts`), paginated 8 per page, whose rows open the client
  profile (talking points, peer benchmarks) and from there the client's deep analysis (the
  former Advisory page, `InsightsView.tsx`, `#/insights`).
  *Replaced:* the step-by-step "My day" chat briefing (in git history before this change);
  "Walk me through my day" in the question box carries its spirit.
- **Inbox** (`InboxView.tsx`) — every client conversation, tied to its transaction; EVA asks,
  follows up and drafts the next step.
- Menu order: Portfolio overview · Work · Inbox · Connectors · Practice.
- **Work** (`TaskManagementView.tsx`, `#/work`) — the one place for work, three tabs:
  - **Tasks** — **Board | List** toggle over one set of work with three statuses, used as
    tags everywhere tasks appear (`WORK_STATUS` / `WorkTag`, also on the overview and in the task
    modal): **To do** (sub-status **Overdue**), **In progress** (EVA drafts ready for your
    review — Review opens the decision modal) and **Done** (latest 5 + "See all in the activity
    log"). List groups by status (default), deadline or client. Cards/rows are **drag-and-drop**:
    reorder within a column, and moving between columns does the work — To do ⇄ Done marks it
    done/reopens it, onto In progress hands it to EVA (shows "EVA is drafting…", then becomes a
    review card), an EVA draft dropped on Done opens the review (never auto-approves), and one
    dropped on To do takes it back as your task. Drag order is session state only.
    **Done is read from the activity log** (today's completed entries), so the two can't drift.
  - **Tasks ⇄ Activity are one record.** `App` writes every board move to the log (an effect
    diffs `tasks`: marked done / reopened / handed to EVA, from any surface), every EVA draft
    (`addDecision` → a "ready for your review" entry) and every review outcome (`resolveDecision`
    updates the same entry). Accepting/dismissing a draft in the log resolves the decision.
    Entries carry `origin: 'tasks'`, `actor`, `event`, `taskId`/`decisionId`. A Done card opens
    the Activity tab with that entry expanded (`focusId`); clicking a task or open EVA draft in the
    log opens the same TaskModal / DecisionReview as the Tasks tab (`onOpenEntry`, rendered in `App`).
  - The Activity log uses the Tasks list's pattern: section cards grouped by day, rows with client avatar and the same status tags (`src/views/workStatus.tsx`).
  - **Activity** (`#/activity`) — everything EVA has done: `ActivityFeedView` rendered `embedded`.
  - **Routines** (`#/routines`) — what's planned and automated: **Scheduled for EVA** (EVA's
    scheduled tasks + the active routines' next runs, in time order) above the routines
    (`SkillsView page="routines"`, content only; "New routine" sits in the page header);
    opening a routine takes over the page (`bare`) and Back returns to the tab.
- **Connectors** (`#/connectors`) — its own menu item: `SkillsView page="connectors"`. Connector
  status lives in `App`, shared with Routines' template gating. The Office view is parked.
- **Practice** (`PracticeView.tsx`) — capacity, profitability, growth & leads, playbooks.
- Off the rail: **Views** (`#/views`).
- **Decisions are one list** (`src/day.ts`, owned by `App`): the overview's "Ready for your
  review" (your items) and Work's review lane (mine / whole practice) render the same objects
  with the same row and Review modal (`src/views/Decisions.tsx`), so wording and state always
  match. "Hand to EVA" in Work returns the drafted task into this list.
- **Tasks are one list too** (`TASKS` in `TaskManagementView.tsx`, state owned by `App`):
  Work's board and the overview's "My tasks" share it. Clicking a task in either opens the same
  `TaskModal` (description, status/due/priority, EVA's steps, Hand to EVA / Mark done), and
  `handTaskToEva` behaves the same from both.
- Shared state in `App`: decisions, tasks, client threads, firm data (`src/practice.ts`).

## The Connectors feature (most recent work)

A Connector is an external system EVA works through, and the **skills** it exposes. Each
skill is one job made of typed **actions**: Read / Reason / Write. Skills are grouped into
areas. Implemented in `src/views/SkillsView.tsx`:

- **Installed list** — core (e-conomic, always-on, can't be removed) + installed partners,
  each with a connection status (Connected / Off / Connection lost), a switch or a
  Reconnect button, and a ⋮ menu (Uninstall + Simulate lost connection).
- **Connector sheet** — one surface with three views: a searchable **directory**, a
  **drill-down** (breadcrumb, areas → skills → typed actions), and a **consent** step
  (host → target, a generated "EVA will be able to…" list, a connecting spinner).
- **Links to routines** — a routine template whose connector isn't installed is filtered
  out of the gallery until it is; switching a connector off that routines depend on shows a
  confirm dialog listing them; template cards show small connector marks.

## Tech stack

- React 18 + Vite + TypeScript, `@economic/taco` v6, Tailwind v3 + inline styles.
- i18n in `src/i18n.tsx` — a Danish dict keyed by the English string; `useLang()` gives
  `{ lang, setLang, t }`. Missing keys fall back to English (connector *content* — skill
  titles/actions — is intentionally English-only; the UI chrome is translated).
- Strict TS (`noUnusedLocals`/`noUnusedParameters`). Build must run from the project dir.

## Running / building locally

```bash
npm install
npm run dev      # http://localhost:5173  (dev-only e-conomic proxy lives here)
npm run build    # type-checks + builds to dist/
```

For subpath hosting (e-conomic.design) build with a relative base:
`npm run build -- --base=./`. The default `base` in `vite.config.ts` is `/eva/` for the
separate GitHub Pages deploy — don't remove it.

## Notes for whoever picks this up

- **The live e-conomic connection layer is hidden** behind `const SHOW_CONNECTION = false`
  in `src/App.tsx`. It gates a Vite dev proxy (`/eco/*` → restapi.e-conomic.com, tokens
  injected server-side from a gitignored `.env`) and the EVA chat island (`eva-island/`, a
  React-19 app using `@economic/agents-react`). None of it ships secrets to the client, and
  it's dormant in the hosted build. Flip the flag + supply tokens to re-enable locally.
- Seed data lives in module consts and is copied into state on mount, so editing data
  needs a full reload (not HMR) to reflect.
- The prototype is intentionally desktop-first; rows/pickers collapse responsively but the
  design target is a wide screen. A global `APP_ZOOM` (0.85) in `src/App.tsx` scales the
  whole app down so more fits on 16"+ screens (the shell compensates its width/height).

## Updates since first publish

- **Cockpit** is now a dashboard: automation KPIs → "Needs your review" table → "Waiting on
  someone else" table → routines-performance overview → recent-activity preview. KPIs are
  scope-aware (portfolio vs. a specific client). A separate **Activity** subpage (`#/activity`)
  holds the full log with advanced filtering (search, area, client, status, date).
- **Routines** page dropped the KPIs for an activity-based "Suggested for you" list; the
  routines list uses the same table styling as the Cockpit.
- **Advisory** consolidated its two tabs into one page: KPI cards → EVA flags & suggestions
  table → graphs (revenue trend + deep analysis).
- **Views** now indicate each view's source — Created by EVA, e-conomic (default), or the
  Advisory Module — and ship three Advisory-Module views.
- **Background**: one shared `CANVAS` token (`#fafafa` in `src/ui.tsx`) for both the outer
  shell and the main content — they must always match; only the sidebar + EVA panel float.
  The full-width chat is the sole white surface.
- Shared row/table components live in `src/views/ActivityView.tsx` (`SectionCard`, `LogRow`
  with a flat `variant="row"`, `WaitingRow`, `useActivityActions`) and are reused across the
  Activity log and the Advisory list.
- **Cockpit is now the AO-house task overview** (`src/views/TaskManagementView.tsx`,
  inspired by "Praksis"). It replaced the old bookkeeping dashboard as the home. It has a
  **My work / Whole practice** toggle in the header — "My work" is the logged-in accountant's
  personal cockpit; "Whole practice" is the manager view (group by accountant/company/
  deadline/status). The model is task-centric with **EVA taking over**: an EVA-drafted
  "Ready for your review" queue (a single *Review* CTA opens a modal showing what EVA did +
  a "Needs your review" callout, with Approve / Take over), an "EVA is handling" live lane, a
  "Scheduled by EVA" upcoming lane, a "Completed by EVA" trail, and a "Hand to EVA" action on
  human tasks. `#/review`, `#/cockpit`, `#/tasks`, `#/praksis` all route here. The old
  `CockpitView` dashboard code remains in `ActivityView.tsx` but is unused.
- Inbox: EVA's suggestion is split into **EVA does** (the bookkeeping action) and **Reply to …**
  (the message, shown as a draft bubble); the conversation scrolls to the latest message.

## Komma learnings, built in (2026-09-28)
After Mads's Komma walkthrough we added what Komma had validated, in EVA's structure:
- **Fix it** (`day.ts` `correction`, `Decisions.tsx`): controlling flags carry the exact posting
  change — field by field, editable, applied only on approval, logged ("You applied EVA's
  correction…"). Seeded: Nordic Build's reverse-charge VAT line and a new *Controlling — August*
  flag for Tech Equipment (rent booked with VAT).
- **Learning from rejections + company memory** (`src/memory.tsx`): dismissing a flag (review
  modal or Activity log) asks *why* and can remember it for the client. Notes show in reviews
  and in the client drawer ("What EVA knows about …"), where you can add or remove them.
- **13-week cash forecast** (`views/Liquidity.tsx`): rules-based weekly balance with the drivers
  (salaries, VAT, bills, overdue invoices), scenarios you toggle or add, and "How EVA calculated
  this". From the client drawer and from cash-flow threads in Inbox.
- **Budget 2027** (`views/Budget.tsx`): 2025 actual / 2026 expected / 2027 by quarter, assumption
  sliders, the owner's goals, a read-only client view, share and Excel export.
- **Month-end as one flow** (`views/MonthEnd.tsx`): on Work → Tasks — bank → documents → missing
  docs → drafts → controlling → close → report, with a per-client month-end report (Excel).
- **Formats**: chat answers that name clients can be shown as a table or exported to Excel.
- **Benchmarks** now state their source (public, aggregated statistics — no identifiable customer).
- Also: Inbox thread list is resizable; the composer grows with the message; Tasks list is always
  grouped by status; Activity log is always grouped by day.
- Modals (review, cash forecast, budget, month-end): fixed header and footer, one vertical scroller in
  between (`flex-1 min-h-0 space-y-*`, no horizontal overflow). Lists inside set `marginBottom: 0` —
  a global `ul` margin otherwise adds 40px of empty space.
- Inbox: EVA's suggestion lives in the composer — the reply as ghost text (Tab or "Use" to take it,
  "Dismiss" to hide) and one line "When you send, EVA will also …" (untick to skip the action).
  Drafts are kept per conversation. Thread list resizes between 320 and 560px.
- **One review queue.** Client conversations waiting on you (with EVA's drafted reply) are part of
  the same queue as EVA's drafts: Work → In progress (kind `reply`), the overview's "Ready for your
  review" and the Activity log (derived from `threads` in `App`, so they clear the moment you send).
  Reviewing one opens the thread in the Inbox; sending is logged ("You replied to …"). Work's badge
  = drafts + replies.
- **EVA prioritises the queue** (`src/priority.ts`): each item gets High/Medium/Low and a one-line
  reason (deadlines and money first). The overview list and Work's In progress are sorted by it
  (your own drag order in Work wins once you reorder).
- Overview boxes cap their content at 300px and scroll inside.
- EVA chat panel: a message types out once; after that (or if you collapse mid-answer) it shows in
  full — reopening the panel no longer re-types everything. Suggestion pills show only before your
  first question. "Show as table" / "Excel" appear only on data overviews (answers listing 2+ clients).
- The conversation travels: expanding the EVA panel opens the full-window chat with the same
  conversation (`Turn[]` via `chatCarry`), and closing it brings everything back to the panel
  (`panelCarry`). Rich chat blocks (tables, plans) stay in the full chat; text turns travel.

