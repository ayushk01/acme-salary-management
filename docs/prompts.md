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

---

## Slice 0 — repo setup (2026-11-23)

### Main prompt

```text
Go. Keep my commit order; the one-commit dangling link is fine.
```

### Follow-up

```text
Yes, create and push
```

---

## Slice 1 — deploy a hello-world (2026-11-23)

### Main prompt

```text
Yes, Render
```

### Follow-up

```text
Yes, push it
```

---

## Slice 2 — pay rules and money (2026-11-23)

### Main prompt

```text
I have deployed the Docker image on render. This is the url: https://acme-salary-management-zobo.onrender.com/

I've also installed orbstack via brew in this Mac locally, so you can run Docker command if required.

You can proceed with slice 2. Let me know in case of any trouble you face.
```

### Follow-up

```text
Commit the working tree changes with a sensible message.
```

---

## Slice 3 — database (2026-11-23)

### Main prompt

```text
Push and continue
```

---

## Slice 4 — deterministic seed (2026-11-24)

### Main prompt

```text
Approve CLAUDE.md with two edits, then commit as docs: add CLAUDE.md.

1. The opening says these are rules we have actually followed, but some start later. Mark them instead of leaving them out: "separate test and code commits (from slice 4)", and add the three design rules with their slice: server-side pagination, search and filters (from slice 5), no hard deletes (from slice 7), aggregates in SQL not JS (from slice 9). Mark "pay rules passed to SQL as bound parameters" the same way if no query uses them yet. Change the opening line to say marked rules start at that slice.

2. Yes to the commit in /api/health, as a tiny step before slice 4: failing test commit, then the code commit. Ten minutes at most. After that you verify every deploy yourself by reading the commit back from the live URL.

Then start slice 4.
```

---

## Slice 5 — the list API (2026-11-24)

### Main prompt

```text
Agreed: no pre-built database, and leave the boot-budget box unticked.

Apply the design.md wording with two changes:
1. Say it is one sample, taken on the boot right after a deploy.
2. Add one sentence on the fix not taken: the seed is deterministic, so the database could be built at docker build time and shipped in the image; skipped as over-building for a demo.

Add a note to the plan's README slice: the README must say the first load after the app sleeps can take up to a minute on the free tier.

Commit the docs, then start slice 5.
```

---

## Slice 6 — the list UI (2026-11-24)

### Main prompt

```text
Push slice 5 and confirm the commit on /api/health. Apply the jobTitleId / departmentId fix to design.md.

One process change before slice 6: before each red commit, show me the test names with their expected values in a short table and wait for my OK. Your expectations have been wrong three slices in a row, so I review those before the code exists. When a test fails after implementation, tell me whether the test or the code was wrong, and why the requirement says so.

Slice 6: keep the UI plain. No new UI library unless you ask first. Give me the plan and the test table, then wait.
```

### Follow-up

```text
Table approved, option A for this slice. Add these rows before the red commit:

13. '?jobTitleId=abc' → jobTitleId: null (same for departmentId)
14. '?dir=sideways' → dir: 'asc'
15. '?page=2.5' → page: 1 (row 5 says whole number; Number('2.5') passes a naive check)
16. reads departmentId out of the URL (row 2 skips it)
17. changing any filter, the search or the sort resets page to 1; changing only the page keeps the filters. Otherwise filtering from page 25 lands on an empty page.

Row 17 needs a small pure function for "apply a change to the filters". Put it in filters.ts.

On B: not now. Plan it for slice 7, the edit form, with two or three component tests only (validation message shows, save sends the right body). Ask me again then. Record the A-now, B-later decision in the ai-log.

Go.
```

---

## Slice 7 — add, edit and mark as left (2026-11-24)

### Main prompt

```text
Both approved: the locale fix and the wider name pools (about 60 × 60). Show me the Intl output for all eight countries in one table, then commit and push both with messages for my OK. If any format looks wrong, fall back to en-US grouping for every country except India.

Note on the export slice in plan.md: CSV writes plain numbers, not formatted money.

From here we ship fast. The brief says they don't want a complex system.
- Build only the Must list: edit form, salary history, country and job overviews, CSV export. Then README and video.
- Discrepancies only if time is left. The full audit view is cut.
- Component tests: two on the edit form, no more.
- Keep test tables short, and don't propose refinements unless something is broken.

Next: slice 7 plan and test table.
```

### Follow-up

```text
Messages approved, but commit in this order: 2 (list UI), then 1 (money fix), 3, 4. The money fix describes a list that commit 2 introduces, so the history reads wrong otherwise.

Slice 7: plan and table approved, and yes to @testing-library/react and jsdom as dev dependencies. Add one row: creating an employee returns 201 and the person appears in the list. The table has no happy path for add.

Go.
```

---

## Slice 8 — salary history (2026-11-24)

### Main prompt

```text
Push slice 7 and confirm the commit on /api/health.

Effective date: the browser sends its local date with the save; the server keeps UTC today only as a fallback when none is sent. One test, one small fix commit, and a line in design.md saying an effective date is a calendar date chosen by the user, not a timestamp. Don't add a date picker.

Both things you did without asking are fine.

Then slice 8: plan and test table, kept short.
```

### Follow-up

```text
Slice 8 table approved. No separate test for localDateIso(). Push the date fix with slice 8.

One detail on row 1: two changes can share an effective date, so break ties the same way every time (newest recorded first). Go.
```

---

## Slice 9 — pay by country (2026-11-24)

### Main prompt

```text
Yes, plan and table
```

### Follow-up

```text
Slice 9 plan and table approved. Average rounds the same way as the median (nearest minor unit). Go.
```

---

## Slice 10 — pay by job title (2026-11-24)

### Main prompt

```text
Yes, plan and table
```

### Follow-up

```text
Slice 10 table approved. Go.

When it's pushed, give me the slice 11 (CSV export) plan and table in the same message. Keep it small: the current filtered list, plain numbers, currency in its own column, and it opens cleanly in Excel.
```

---

## Slice 11 — CSV export (2026-11-24)

### Main prompt

```text
Approved, go
```

---

## Wrap-up and slice 12 (2026-11-24)

### Main prompt

```text
Yes, start the wrap-up. Leave the money function duplicated; no shared workspace.

README, in my voice, first person, plain, about one page:
- live URL, with the warning that the first load after sleep can take up to a minute
- run it locally in three commands, and how to run the tests
- the seven questions it answers and where to click for each
- key decisions in one line each, linking to design.md
- what was cut and why
- how I used AI: link CLAUDE.md, ai-log.md and prompts.md, and name two places the AI was wrong
- measured performance numbers, including the 8 second boot on the free tier
- known limits: data resets on redeploy, no login, and a CSV cell that starts with = is not neutralised

Show me the README draft before committing. Then the video outline, 3 to 5 minutes.

After the README draft: discrepancies as one short slice. Requirements question 4 promises it and payRules.ts is unused without it. One endpoint, one page, the SQL from design.md section 4. Give me the plan and a short test table. If it isn't done in about an hour, we stop and I change the requirements page to say question 4 is not in v1.
```

### Follow-up

```text
README approved with three changes:

1. The run instructions can fail on a machine with no build toolchain: our own three-row test showed any install from the lockfile runs node-gyp rebuild. Prove the README's exact commands in a clean clone inside node:26-slim, which has no Python. If they fail, change the README to the install command that works (npm ci --ignore-scripts, as in the Dockerfile) with one line saying why, and re-run the proof. Tell me what you ran and what happened.

2. Change "I made every decision" to "The product and design decisions are mine". The ai-log shows you made small calls that I approved afterwards, so the absolute version is not accurate.

3. Add a "Demo video" line under the live URL, left as a placeholder until I record it.

Don't commit the README yet. The question 4 row and the "What I cut" entry change if discrepancies lands.

Discrepancies: plan and table approved, with one more row. Someone more than 25% below the median is listed, with a negative percentage. The rule has two branches and the table only tests the upper one. Go.
```

### Final pass

```text
Yes. Update the README for discrepancies: the question 4 row, the cut list, the test count (130) and a discrepancies line in the performance table. Move discrepancies out of anything that still calls it unbuilt in requirements.md and plan.md.

Check one thing in the browser: pick a country with no one outside range and confirm the page shows a clear "nobody is outside range" message, not an empty table.

Then a final pass:
- ai-log.md and prompts.md complete through this slice
- CLAUDE.md has no stale "(from slice N)" markers
- every doc link in the README opens
- CI green, and the live /api/health shows the final commit

Show me the commit messages, then push. After that the code is frozen: only the video link goes into the README.
```
