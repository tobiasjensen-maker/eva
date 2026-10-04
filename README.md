# EVA — Agentic Accounting Platform

An interactive prototype of **EVA**, e-conomic's agentic accounting Virtual Assistant: the accounting office's front door. It opens on the accountant's **Portfolio overview** (ask EVA about your clients, your tasks, what's ready for your review, where your clients' books stand, your client list), with **Inbox**, **Work** (tasks, EVA's activity, routines), **Connectors** and **Practice** behind it. All mock data, fully client-side.

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

**Live:** https://e-conomic.design/tobiasjensen-maker/agentic-platform/

See [LEARNINGS.md](./LEARNINGS.md) for the full handover.

Built with React 18 + Vite + `@economic/taco` v6.
