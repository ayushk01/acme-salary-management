# Prompts

My main prompt for each step, word for word, plus the decisions I gave
back. Kept so the thinking behind the code is visible, not just the code.

---

## Step A — kickoff and requirements review (2026-11-23)

### Main prompt

```text
I'm doing a take-home assessment for Incubyte (a software-craft, TDD-focused
company) for a Node/React/TypeScript role. They require AI tools and grade
how I use them: clear thinking, design judgment, production-quality code
and tests, incremental commits. I make every decision; you are my pair.

THE PRODUCT
Salary management web app for ACME's HR manager: 10,000 employees across
multiple countries, currently managed in Excel. The HR manager must manage
salary data and answer questions about how the org pays people.
My requirements are in docs/requirements.md; planning notes are in docs/planning/.

HARD REQUIREMENTS FROM THE BRIEF
- Backend: Node + TypeScript, relational DB (SQLite). UI: React.
- Seed script with 10,000 employees.
- Meaningful unit tests: fast, deterministic, easy to understand.
- Deployed and fully functional, plus a video demo.
- Incremental commits that show how the solution evolved.
- Committed artifacts: requirements, design notes, prompts, trade-offs,
  performance considerations.
- They want good judgment, not the most complex system.

HOW WE WORK (follow these for the whole project)
1. One step at a time. Never jump ahead or touch things outside the
   current step.
2. Before any change: show me a short plan. Where there is a real choice,
   give me 2-3 options with trade-offs and your recommendation, then WAIT
   for my decision.
3. Test first: write the failing test, show it to me, then the minimum code
   to pass, then refactor. No real clock, no randomness, one behaviour per
   test.
4. After every change, tell me: what changed (files), why, what it affects,
   and anything I should double-check. Keep it short.
5. Never commit by yourself. Propose a commit message (docs:/test:/feat:/
   refactor:/chore:), wait for my OK or my edit, then commit. Small commits.
6. After each step, append an entry to docs/ai-log.md: what I asked, what
   you proposed, what I accepted / changed / rejected and why. Be honest,
   including where you were wrong. Also append my main prompt for the step
   to docs/prompts.md, word for word.
7. Docs are mine: for requirements/design/plan you review and suggest; I
   decide and you apply only what I approve.
8. No new dependencies without asking. No code or data from any other
   project. Nothing from Incubyte's brief is copied into the repo.
9. Explain briefly as we go. I must be able to extend this code live,
   without AI, in the next interview round. If I seem to accept something
   I may not understand, ask me to explain it back.
10. If I'm over-building, say so.

ENGINEERING RULES
- Layers: routes -> services -> repositories. Small, well-named functions.
- Money: integer minor units + ISO currency code. Never floats. No
  cross-currency maths; show local currencies side by side.
- Aggregates (count/min/max/avg/median) computed in SQL, not in JS.
- Server-side pagination, search and filters. Indexes where queries need them.
- No hard deletes: employees are marked as left; history and audit stay.
- Salary changes are recorded (old -> new, date, changed by).
- Seed is deterministic (fixed seed), one transaction, timed.
- Validate inputs at the API boundary; consistent error format.

ORDER OF WORK
A. Review docs/requirements.md as a senior product engineer: gaps,
   contradictions, vague "done when" lines, scope risks. List issues
   with a one-line reason each. Do NOT rewrite it. I'll decide what to change.
B. docs/design.md: architecture, data model, API, key trade-offs, test
   strategy, performance, deployment. Ask me the decisions; draft only
   after I answer.
C. docs/plan.md: thin vertical slices as a checklist.
D. CLAUDE.md: capture these working + engineering rules so they persist.
E. Repo setup: TypeScript, lint, test runner, CI (lint + test), and a
   hello-world deploy early so deployment can't surprise us later.
F. Build slice by slice (domain metrics -> DB -> API -> seed -> UI list ->
   add/edit/mark-left -> insights -> outliers -> audit -> CSV export).
G. README (live URL, how to run, decisions), performance notes, final
   pass on ai-log and prompts.
H. A 3-5 minute video outline for me to record.

Start with step A now. Create docs/ai-log.md and docs/prompts.md as part
of it and show me what you'd put in them before writing.
```

### My decisions on the review

```text
* C1: median.
* C2: currency belongs to the country. Each country has one currency, and an employee's currency comes from their country. Simpler, and the statistics never mix currencies.
* G1: employee fields: unique employee code (e.g. EMP00001), full name, email, job title, department, country, salary, hire date, status (active / left), date left.
* G2: job title, department and country come from fixed dropdown lists, never free text.
* G3: salary change = new amount + effective date (defaults to today) + reason (raise / promotion / correction). No backdating rules beyond that.

The rest, decided quickly:

* G4 (transfers between countries): out of scope for v1.
* G5: minimum group size of 5 for the outlier rule.
* G6: people who've left are hidden by default with an "include left" toggle, their leaving date is recorded, and they're read-only.
* G8: search and list respond in under 500 ms.
* G9: sort by name or salary, 20 per page.
* G10 + S1: audit means salary changes plus added / edited / left events per employee, not a general system that tracks every field. That avoids the over-build.
* G11: "Your name" is entered once and remembered for the session.
* G13: the last save wins; say so in the doc.
* G14: yes, the seed data includes people who've left, salary history and some deliberate outliers.
* G15: decide in the design step.
* S2:
   * Must: search/list, add/edit/mark as left, country overview, job overview, export.
   * Should: outliers, salary history.
   * Could: an audit view beyond the history.
   * Deadline: tonight.
* C3–C7, the "done when" lines, the typos, the persona wording: "accept all, apply them".
```

---

## Step B — design (2026-11-23)

### Main prompt

```text
Start step B
```

### My answers to the four decisions

```text
Deploy + persistence: Volume-backed SQLite — one Node process serves the
API and the built React app; the SQLite file sits on a persistent disk.
Edits survive redeploys and restarts.

Stack: Drizzle ORM — typed queries and real migrations.

Test boundary: Domain + SQL on in-memory DB — pure functions for the
outlier rule and money formatting; repository and service tests against a
:memory: SQLite seeded with ~10 hand-written rows; a few HTTP tests
pinning the error format and pagination contract.

UI shape: Routed pages, filters in the URL — react-router,
/employees?country=IN&page=2 plus pages for the country, job and
discrepancies views.
```

### Revisions before committing

```text
Not yet. Three changes first, then commit.

1. docs/requirements.md must be ONE page (the brief says so). Trim it to
   about 500 words: problem, user, questions, features as one line each
   with Must/Should/Could, out of scope with reasons, assumptions, done
   means. Move Data, Rules, Performance and Seed into design.md, and the
   detailed "done when" lines into docs/acceptance-criteria.md. Lose no
   decisions, only relocate them. Show me the trimmed version before
   writing.

2. Audit wording: requirements must not promise full change history as a
   Must. Must = salary history plus last-changed-by/at. Full audit view
   stays Could. Make requirements, design and plan agree.

3. Hosting:  I checked on fly.io and I have to have a valid payment method to mount a volume, which I don't want to do at this point. Switch to no persistent disk + seed on boot when empty; update the
      deployment section and note the trade-off (data resets on redeploy;
      first load may be slow if the host sleeps).

Commits, in this order:
- "docs: trim requirements to one page, move detail to design"
- "docs: add design and slice plan"

Then start slice 0 and stop for my review before the Dockerfile.
```
