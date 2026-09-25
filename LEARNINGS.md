# EVA — Agentic Accounting Platform (prototype)

> **Live:** https://e-conomic.design/tobiasjensen-maker/agentic-platform/
> **Hosted at:** e-conomic/eco-prototypes · prototypes/tobiasjensen-maker/agentic-platform/
> **Published:** 2026-09-25

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
- **Work** (`TaskManagementView.tsx`, `#/work`) — the one place for work, three tabs:
  - **Tasks** — your plate + what's ready for your review + what EVA is handling right now —
    always your own work (the office-wide view lives under Practice). "Completed by EVA" is a pointer into Activity.
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
