# EVA — Agentic Accounting Platform (prototype)

An interactive prototype of **EVA**, e-conomic's agentic accounting Virtual Assistant.
It shows how an accountant/bookkeeper works *with* an AI agent that runs the recurring
bookkeeping jobs, surfaces what needs a human, and can be extended with third-party systems.

**Live:** https://e-conomic.design/tobiasjensen-maker/agentic-platform/

## What it is

A single-page app (hash routing) that mocks a full agentic product surface. All data is
**mock/placeholder** — there is no backend in the hosted build.

Primary navigation (the mental model):

- **Cockpit** — the control centre for core bookkeeping. A feed of what EVA did, what
  needs you (review), and what it's waiting on someone else for. Trace on demand.
- **Advisory** — the advisory layer (proactive review + financial insights), kept
  separate from the core bookkeeping tasks.
- **Routines** — the agentic taxonomy in action: a Routine (job) is a Trigger →
  Conditions → Actions flow. Includes a routine builder, an Office (partner) view, and
  **Connectors**.
- **Views** — saved artefact-style views.
- **EVA** — the assistant, as a resizable side-panel that expands to a full-window chat.

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
  Cockpit, the Activity log, and the Advisory list.
