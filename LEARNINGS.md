# EVA — Agentic Accounting Platform (prototype)

> **Live:** https://e-conomic.design/tobiasjensen-maker/agentic-platform/
> **Hosted at:** e-conomic/eco-prototypes · prototypes/tobiasjensen-maker/agentic-platform/
> **Published:** 2026-10-05

An interactive prototype of **EVA**, e-conomic's agentic accounting Virtual Assistant.
It shows how an accountant/bookkeeper works *with* an AI agent that runs the recurring
bookkeeping jobs, surfaces what needs a human, and can be extended with third-party systems.

**Live:** https://e-conomic.design/tobiasjensen-maker/agentic-platform/

## The vision (visiontype)

*A visiontype is a clickable vision, not a spec: it shows where e-conomic could take the
accounting office with agents, so we can react to something concrete.*

**The accountant's day starts in one place — their portfolio — while EVA, a team of agents,
runs the recurring work across every client:** bookkeeping, bank reconciliation, controlling,
VAT, month-end close and payroll. People do what only people should: review EVA's drafts, make
the judgement calls and advise their clients.

What it shows:
- **One review queue, ranked by EVA** — corrections, payroll exceptions and client replies, each
  with EVA's suggestion and the facts; a fix is applied in one click and logged.
- **Work as a board** — To do · In progress · Done — connected to a full activity log with trace.
- **Operations end to end** — month-end per client, step by step; the books show what EVA booked
  and why; payroll is run by agents.
- **Practical advisory** — a 13-week cash forecast and a budget with a client view, shared to the
  client from the Inbox.
- **Trust by design** — rules before the LLM, company memory, learning from dismissed flags,
  everything logged and reviewable.

Mock data only. Builds on the learnings from Komma (controlling with "Fix it", liquidity,
budgeting, company context, adoption).


## Two scopes: Vision and AX (`src/edition.tsx`)

**AX** is what we build first — *agent management and period closing* — shown as a filtered view of
the same app. **Vision** is the full product. Switch in the settings menu (profile → Scope: Vision | AX),
or link straight in with `?scope=ax` / `?scope=vision` (the param only sets the start; the choice is kept
in localStorage). AX shows an orange **AX** tag next to the logo.

Because it's one codebase, **every change to a shared screen shows up in both scopes.** AX hides:
- **Pages:** Inbox, Practice, client Insights (+ Views, Customers) — `AX_HIDDEN_VIEWS`; the menu and
  phone tab bar filter them out and going there redirects to the overview.
- **Advisory and client-conversation content:** client replies in the review queue / Work / month-end
  report; advisory and Inbox activity (`AX_HIDDEN_SKILLS`); people's advisory tasks (calls, meetings,
  advice, workshops — `axHidesTask`; sign-off stays); in the client drawer the cash forecast, budget,
  talking points, benchmarks, "why flagged" and the conversation link; the ledger's Insights link.
- **"My tasks" and client figures:** no My tasks card on the overview (it shows *Ready for your review* and
  *Books status*); Work has no To do column or New task button; the client list drops Fee, Revenue,
  "EVA does" and "Needs you"; the client drawer has no KPI tiles.
- **Payroll:** the payroll routine, its activity, the October payroll decision, the scheduled payroll run,
  the payroll lines in EVA's answers — `isPayroll()`; the ledger shows plain *Salaries*.
- **Work layout:** the list only (no Board / List toggle), with just *For review* and *Done* — no
  *In progress* (that's Vision: work being done right now by you or by EVA).
- **Client overview:** just No., Client and Books — no Services column, no industry under the name.
- **Suggestions:** the overview question box and EVA panel suggest *What's left to close September?* /
  *What did EVA do overnight?* instead of the advisory prompts.

AX keeps: the Portfolio overview (review queue, Books status, client list), Work (task list, review
modals with Fix it, Activity, Routines, month-end flow and report), the books, Connectors, EVA everywhere,
mobile and Danish.

Screens in AX get filtered lists (`decisionsShown`, `tasksShown`, `skillsShown` in App.tsx); the actions still
update the full state, so switching scope never loses work.

**When you add something:** if it's part of agent management or period closing, do nothing — it's in
both. If it's Vision-only (advice, client conversations, practice management), gate it with
`const { ax } = useScopeMode()` (or add the page to `AX_HIDDEN_VIEWS`).

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
  Reviewing one opens a reply modal (`ReplyReview`: EVA suggests, the conversation, editable reply,
  the action toggle) — sent from there, no jump to the Inbox; sending is logged ("You replied to …"). Work's badge
  = drafts + replies.
- **EVA prioritises the queue** (`src/priority.ts`): each item gets High/Medium/Low and a one-line
  reason (deadlines and money first). The overview list and Work's In progress are sorted by it
  (your own drag order in Work wins once you reorder).
- Overview list boxes cap their content at 300px and scroll inside; the Books status card doesn't (`scroll={false}`).
- EVA chat panel: a message types out once; after that (or if you collapse mid-answer) it shows in
  full — reopening the panel no longer re-types everything. Suggestion pills show only before your
  first question. "Show as table" / "Excel" appear only on data overviews (answers listing 2+ clients).
- The conversation travels: expanding the EVA panel opens the full-window chat with the same
  conversation (`Turn[]` via `chatCarry`), and closing it brings everything back to the panel
  (`panelCarry`). Rich chat blocks (tables, plans) stay in the full chat; text turns travel.
- EVA side panel: a kebab (⋯) menu holds New chat and Conversation history. History is kept for
  the session across pages (`PANEL_HISTORY`, seeded); switching or starting a new chat files the
  current conversation first. The full-window chat keeps its own History / New chat buttons.
- Review modal: one purple "EVA suggests" box at the top (EVA's recommendation + why you're asked),
  replacing the separate "Needs your review" and "EVA's call" boxes.
- **New task** opens a creation modal: what (with quick picks), client, due, priority, and *who does
  it* — EVA (now → drafting, then In progress for review; or scheduled tonight/tomorrow → Routines'
  Scheduled for EVA) or a person (you → To do, or someone on the team).
- Native selects share one style (`index.css`): no browser chrome, a custom chevron with room,
  focus ring. `ul`/`ol` margins are reset globally (taco's base CSS adds them).
- **The books** (`views/Ledger.tsx`): "View the books" in the client drawer opens the client's
  general ledger — chart of accounts with period balances (September / Q3 / year to date), postings
  per account with VAT code, debit/credit and running balance, search, Excel. It reads shared
  state: open EVA flags are highlighted with *EVA flag · Review* (same review modal), applied fixes
  show corrected, and Bryg & Co's restaurant bill sits in suspense until Mads's reply is sent.
  Opens on the period that contains what EVA wants you to see. Postings are generated per client.
- **Share to the Inbox** (`views/Attachment.tsx`): "Discuss with …" (cash forecast) and "Share with …" /
  "Ask … to confirm" (budget) open the Inbox in that client's conversation (or start one) with a
  drafted message — written from the actual numbers and any scenarios you ticked — and a small
  preview card attached (key figures + mini chart). Remove it or edit before sending; the card stays on
  the sent message. From the Inbox's own *Cash forecast* button it drops into the current thread.
- Portfolio overview → Books status: the footer link is "Month-end report →" and opens that report modal
  (exported `MonthEndReport`), instead of jumping to Work.
- **Month-end report → a client** shows what's left to close September: each item tagged with whose
  move it is (You / Client / EVA) and an action — Review (open correction), Reply (client waiting),
  Remind now (missing documents; in the demo they arrive ~2.5s later and EVA matches them), Approve &
  post (draft postings) — plus the client's 8 month-end steps. *Close September* is enabled once
  nothing is left. Lists the real open flags and replies from shared state; works from both the
  overview's Books card and Work's month-end card.
- Ledger: a **Booked by** column — EVA (its mark) for bills, bank-matched payments and its own bookings;
  the client's owner for the invoices they create; *You* for the opening balance and corrections you applied.
  Payroll is EVA's (`Payroll — <month> (EVA payroll run)`).
- **Payroll is run by agents.** *Run payroll every month* is a pre-installed, active routine (collect
  hours → check tax cards → calculate → explain changes → route exceptions → pay & report to
  eIndkomst → book the journal). October's run is in *Scheduled for EVA* (28 Oct); payroll tasks are
  EVA's (scheduled/done), the one exception (Office Supplies: new hire without a tax card) is a
  high-priority review; Activity logs September's report and October's draft; the ledger shows
  `Payroll — <month> (EVA payroll run)` booked by EVA; "Walk me through my day" mentions it.
- Activity traces name the logged-in accountant (Tobias) as approver/authority on their own work.
- Month-end report → client → **each of the 8 steps opens** what was done: who (EVA / you / waiting on the
  client), when, a summary and the detail lines (bank import, matches, missing documents, inbox reads,
  postings, controlling rules, close checks). Reflects what you did in the report (reminded, posted, closed).
- **People do people work.** Every bookkeeping task (debtor follow-up, VAT, month-end, annual report
  drafts, supplier invoices, payroll) is EVA's — running, scheduled or done. Human tasks are the
  relationship, advice and sign-off: a cash-flow call, a quarterly review, signing the annual report,
  customer-concentration advice, budget/growth/hiring conversations (`isPeopleWork`). Their modal shows
  *What EVA prepared for you* and has no "Hand to EVA"; dragging one to In progress opens it instead.
- Books status donut: on load each slice draws in with a soft ease-out, staggered, while the ring fades
  and turns a few degrees into place (the total is static; skipped for reduced motion / hidden tabs), hover a slice or legend item to focus it (centre shows count and
  share), click to open the month-end report filtered to that status (filter chips in the report).
- **Land softly** (`index.css`): `.land` fades an element in and settles it ~10px into place (640ms,
  ease-out, delay via `--d`); `.land-kids` does the same for a container's direct children, staggered.
  Used on the overview (greeting → question → chips → cards → client list), Work (numbers, month-end,
  toolbar, board), Inbox, page headers, Activity, Routines, Connectors, Practice and Insights. Off for
  reduced motion. Keep modals out of `.land` / `.land-kids` containers (an animated ancestor traps a fixed
  overlay inside it) — or render them with `createPortal(…, document.body)`, as the month-end report does.
- **Marking a task done** (overview, Work board, any task modal) shows a confirmation at the bottom: a check
  that draws itself with a small burst of EVA-coloured dots, "Done · <task> — logged in Activity", and Undo
  (restores the previous status). The card arriving in Done gets a soft green pop. Practice metric cards land too.
  The same confirmation follows reviewing EVA's work: *Approved*, *Fixed*, *Dismissed* ("EVA will remember why"),
  *Taken back* — with Undo that puts the draft back in the queue — and *Sent* for client replies (no Undo).
- **Phones** (`useIsMobile`, <768px): bottom tab bar instead of the sidebar; EVA is a floating button
  and opens full screen; page gutters 16px; 4-up grids go 2-up; modals use the full width; Work's board
  swipes one column at a time; Inbox shows the list *or* the conversation (back button); the ledger
  swaps its account sidebar for a picker; month-end tables drop the bank/matched columns. CSS hooks in
  `index.css` (`.m-stack`, `.m-grid2`, `.m-hide`, `.board-grid`, `.me-grid`).
- **Danish is complete** for everything reachable in the demo. `translate()` checks the dictionary, then
  `PATTERNS` — sentence frames for text built from data ("In 3 days", "EVA drafted “…” — ready for your
  review", ledger "Invoice — …", dates, weekdays). In dev, untranslated strings shown in Danish mode are
  collected in `window.__missingDA` — click through in Danish and read it to find gaps. Add entries with
  care: some dictionary lines hold several pairs, and keys with an apostrophe need double quotes.
- The overview greeting follows local time: Good morning (5–12) / afternoon (12–18) / evening.
- Work's metric cards were removed — the board and its filter chips carry the counts.
- **One EVA across every screen.** The side panel is a single assistant — no per-page "inbox assistant" etc.:
  one intro, one set of suggestions, and the same conversation as you move between pages (it stays open or
  closed as you left it). Answers still use the page you're on. The conversation and open/closed state also
  survive a refresh (sessionStorage `va-chat-msgs:eva`, localStorage `va-chat-collapsed`).
- Asking from the overview's question box hands the conversation to the EVA panel and moves the focus to
  the panel's input, so you can keep typing.
- The profile picture in the side menu has no notification dot.


## Work statuses (`src/views/workStatus.tsx`)

To do (+ Overdue) · **In progress** · **For review** · Done. *For review* is EVA's drafts and replies
waiting on you (both scopes). *In progress* (Vision only) is work being done now — tasks you've started
(`in-progress`) and tasks EVA is running (`eva-running`). Dragging a card onto For review hands it to
EVA: it shows in In progress while EVA drafts, then comes back as a For review item.

## Routines are the schedule

There's no separate "Scheduled for EVA" list: each routine in *Your routines* shows its next run (`NEXT_RUN`
in SkillsView, or its trigger for routines you build), sorted by when it runs. One schedule, one source.
