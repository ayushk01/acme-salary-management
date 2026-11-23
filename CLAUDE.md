# CLAUDE.md

How we work on this repo. These are rules we actually follow, not
aspirations. A rule marked *(from slice N)* is agreed but does not bind
until that slice reaches it — the plan is in `docs/plan.md`. If a rule
here stops being true, change it or delete it.

## Working agreement

- **One step at a time.** Do the current step. Do not start the next one
  or touch files outside it.
- **Plan before changing.** Short plan first. Where there is a real
  choice, give 2–3 options with trade-offs and a recommendation, then
  wait for my decision.
- **Test first.** Write the failing test, run it, show me the red output,
  then the minimum code to pass, then refactor.
- **Show the test table before the red commit.** List the test names with
  their expected values and wait for my OK, before the code exists. My
  review is of the expectations, not the implementation.
- **When a test fails after the code is written**, say plainly whether the
  test or the code was wrong, and which requirement decides it. Do not
  just change the expectation until it passes.
- **Commit the failing test and the passing code separately** *(from
  slice 4)*. Two commits: `test:` with the red test, then `feat:`/`fix:`
  with the code that turns it green. Push them together, so CI judges the
  green tip rather than the red commit.
- **Never commit unasked.** Propose the message, wait for my OK or my
  edit, then commit. Small commits.
- **Report after every change**: what changed, why, what it affects, and
  anything I should double-check. Keep it short.
- **Log every step.** Append to `docs/ai-log.md` — what I asked, what you
  proposed, what I accepted, changed or rejected, and where you were
  wrong. Append my prompt verbatim to `docs/prompts.md`.
- **The docs are mine.** For requirements, design and plan you review and
  suggest; I decide, and you apply only what I approve.
- **No new dependencies without asking.** Check the registry for current
  versions rather than writing them from memory.
- **Say what is unverified.** If something was not run, say so rather
  than implying it passed. A check that does not run the real command is
  not a check.
- **Say when I am over-building.**

## Engineering rules

- **Layers**: routes → services → repositories, plus a pure domain layer
  with no I/O. A route never writes SQL; a repository never knows about
  HTTP.
- **Money is integer minor units plus an ISO currency code.** Never a
  float, never converted between currencies, never summed across
  countries. `amountMinor / 100` is the bug this rule exists to prevent.
- **Pay rules live in one place** (`server/src/domain/payRules.ts`). They
  are passed to SQL as bound parameters, so the query
  and the pure function cannot disagree about the rule.
- **Server-side pagination, search and filters** *(from slice 5)*. The
  browser never receives more than a page; 20 rows per page. Only the CSV
  export returns everything.
- **No hard deletes** *(from slice 7)*. Employees are marked as left;
  their record, salary history and audit trail stay.
- **Aggregates are computed in SQL, not JavaScript.**
  Count, min, max, average and median are the database's job, including
  the median, which SQLite has no built-in for.
- **Country, job title and department are fixed lists**, never free text.
  Free text splits "SDE2" and "SDE 2" and breaks every grouped statistic.
- **Database**: `foreign_keys = ON` and WAL on every connection — SQLite
  leaves foreign keys off by default, so without the pragma the schema's
  references do nothing. Migrations run at boot, before the server
  listens.
- **Tests run against a real in-memory SQLite** with the same migrations,
  not a mocked repository. The logic worth testing lives in SQL.
- **Tests are deterministic**: no real clock (inject it), no randomness
  (fixed seed), one behaviour per test, names that read as sentences.

## Checks

`npm run lint`, `npm run format`, `npm run typecheck`, `npm test` — all
four run in CI on every push, and should be green before any commit.

## Where things live

| Path | What it holds |
| --- | --- |
| `docs/requirements.md` | What the product must do, one page |
| `docs/acceptance-criteria.md` | Testable conditions per feature |
| `docs/design.md` | Architecture, data model, rules, trade-offs |
| `docs/plan.md` | Build order as thin vertical slices |
| `docs/ai-log.md` | How AI was used, and where it was wrong |
| `docs/prompts.md` | Prompts behind each step, word for word |
