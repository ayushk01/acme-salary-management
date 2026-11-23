# AI log

How I used AI on this project, step by step: what I asked, what it
proposed, what I accepted, changed or rejected, and why. Including where
it was wrong — the point of this log is the thinking, not a highlight reel.

My prompts, word for word, are in [prompts.md](prompts.md).

---

## Step A — requirements review (2026-11-23)

**What I asked.** Review `docs/requirements.md` as a senior product
engineer: gaps, contradictions, vague "done when" lines, scope risks. One
line of reasoning per issue. Do not rewrite the document — I decide what
changes.

**What Claude proposed.** 30 issues: 7 contradictions, 15 gaps, 7 vague
done-when lines, 2 scope risks, 2 minor. It ranked five as the ones that
change the data model, and asked me to decide those first:

1. Average or median as the outlier baseline — my requirements said
   average, my planning note said median.
2. Currency attached to the country or to the employee.
3. No employee field list, so no unique identifier.
4. Free text vs fixed lists for job title, department and country.
5. Salary change semantics undefined (effective date, reason, backdating).

It also flagged that the audit feature was the main over-build risk, that
there was no priority order and no deadline, and that three `.DS_Store`
files are committed.

**What I decided.**

| Issue | My decision | Why |
| --- | --- | --- |
| Outlier baseline | **Median** | The average is dragged by the very outliers the rule is meant to find. |
| Currency | **Belongs to the country** | One currency per country, employee inherits it. Simpler, and statistics can never mix currencies. |
| Employee fields | Code, name, email, job title, department, country, salary, hire date, status, date left | Employee code is the identifier; names are not unique at 10,000 people. |
| Field types | **Fixed dropdown lists** | Free text would split "SDE2" and "SDE 2" and break every statistic. |
| Salary change | New amount + effective date (defaults to today) + reason | Enough to answer "how has it changed", without inventing an approval process. |
| Country transfers | Out of scope for v1 | Changes currency, which makes history incomparable. Not worth it tonight. |
| Minimum group size | **5 active employees** | A group of one is always exactly at its own median. |
| People who have left | Hidden by default with a toggle, leaving date recorded, read-only | Keeps history and audit intact without polluting the statistics. |
| Performance | Under 500 ms for search and list | Gives the "finding people fast" line something testable. |
| List behaviour | 20 per page, sort by name or salary | Server-side; the browser never gets 10,000 rows. |
| Audit scope | Salary changes + added/edited/left, per employee | Rejected the generic field-level audit system — that was the over-build. |
| "Changed by" | Typed once, remembered for the session | No login in v1, so this is the honest minimum. |
| Concurrent edits | Last save wins, stated in the doc | A small team; locking would be over-engineering. |
| Seed data | Includes leavers, history and deliberate outliers | Otherwise the insight screens are empty in the demo. |
| Persistence on deploy | Deferred to the design step | It drives the hosting choice, so it belongs there. |
| Priority | Must / Should / Could, deadline tonight | Export and the two overviews must ship; outliers and history should; a separate audit view only if everything else is done. |
| C3–C7, done-when lines, typos, persona | Accept all | No argument with any of them. |

**What I applied.** `docs/requirements.md` rewritten against those
decisions: added a Data section (employee fields, salary change, fixed
lists), a Rules section (outlier rule, leavers, who-changed-it, last save
wins), a Performance section and a Seed data section; every done-when made
testable with named columns and boundary cases; priority tags added;
payroll de-duplicated; the open-questions section reduced to the one
question that is actually open.

**Inferences Claude made while applying, that I should sanity-check.** It
said these follow from my decisions rather than being new choices:

- Department is a filter and a field only — no department statistics,
  since nothing in section 3 asks for them.
- Search covers name *and* employee code, because the code is the
  identifier.
- Job pay overview shows all four figures per country, not just min/max,
  for consistency with the country overview (my "accept C3").
- Email is required; whether it must be unique is still undecided.

**Where Claude was wrong or less useful.**

- It produced 30 issues before asking about my deadline. The deadline is
  the single thing that governs which issues matter, so it should have
  been the first question, not issue S2 near the bottom. Several items
  (persona wording, department statistics) were not worth my attention
  for a one-night build.
- It listed "nothing stops adding the same person twice" as its own gap
  when that is just a consequence of having no identifier — padding the
  count rather than sharpening the list.
- It has not seen the original brief, so it could only check my document
  against itself and against my planning images. Any gap between the
  brief and my requirements is mine to catch, not something it can find.
- It correctly caught the one genuine contradiction I had missed: my
  requirements said *average* while my own planning note said *median*.
  That one was worth the whole pass.

---

## Step B — design (2026-11-23)

**What I asked.** Start step B: architecture, data model, API, trade-offs,
test strategy, performance, deployment. Ask me the decisions first; draft
only after I answer.

**What Claude proposed before drafting.** Seven things it said followed
from decisions already made, offered for veto rather than as questions:
the median window function, a `countries` table carrying the currency
*and* its minor-unit exponent (JPY has none where INR has two), npm
workspaces, plain `fetch` instead of a data-fetching library, one error
shape, GitHub Actions for lint and tests, and no migration tool. Then four
real forks, each with options and a recommendation.

**What I decided.**

| Decision | My choice | Why |
| --- | --- | --- |
| Hosting and persistence | Volume-backed SQLite, one process serving API and React | Edits surviving a restart matters: a reviewer who adds an employee, comes back later and finds it gone reads that as a bug, not as a documented trade-off. Closes the last open question in requirements.md. |
| Stack | **Drizzle ORM** (Claude recommended hand-written SQL) | Typed queries and real migrations are worth the setup cost, and they read well in an assessment. |
| Test boundary | Pure domain + repository tests on `:memory:` SQLite + a few HTTP contract tests | The aggregates live in SQL by design, so pure-function tests alone would verify almost nothing that is graded. |
| UI shape | Routed pages with filters in the URL | Shareable links, a working back button, and export simply reuses the current URL's filters. |

**Where I overrode the recommendation, and what it costs.** Claude argued
for `better-sqlite3` with hand-written SQL on the grounds that every
aggregate in this app — median, the outlier rule — drops to raw SQL
anyway, so an ORM is paid for and then bypassed where it matters. I took
Drizzle regardless. The consequence is recorded honestly in design.md:
those two queries go through Drizzle's `sql` template tag, so they are the
lines I need to be able to explain unaided in the next round. The
schema also moves to TypeScript with `drizzle-kit` migrations rather than
the `schema.sql` that was proposed.

**What was drafted.** `docs/design.md` and `docs/plan.md`. Two design
calls worth naming because they are judgment, not mechanics:

- **Current salary is denormalised** onto the employee, with the history
  in its own table. Every statistic is an aggregate over current salary,
  and those are the queries with a 500 ms budget. Deriving the current
  value from the newest history row would put a window function in front
  of every aggregate. The drift risk is handled by writing both inside one
  transaction and testing that they agree.
- **Audit ships in two stages.** Stage one adds no table at all —
  `created_at/by`, `updated_at/by`, `left_date` and the salary history
  already answer "who changed this, and when". The `audit_events` table is
  designed but built only if the Could item is reached. This is the direct
  answer to the over-build risk flagged in step A.

**Where Claude was wrong or sloppy.**

- It proposed "no migration tool, use a `schema.sql`" in the same message
  as offering Drizzle as an option — and Drizzle brings `drizzle-kit`
  migrations with it. The proposal contradicted one of its own options,
  which I should have caught as easily as it should have.
- It bundled four independent dependency choices (driver, framework,
  validation, test runner) into a single "stack" question. Efficient under
  a deadline, but it meant I approved express, zod and vitest without
  being shown alternatives for any of them.
- The deployment option it recommended came with pricing it explicitly
  would not vouch for. Correct to flag rather than guess, but it leaves me
  to verify the volume is actually affordable before slice 1.

### Step B revisions — three corrections I made before committing

**1. Requirements had to be one page.** The brief asks for it, and the
draft had grown to roughly 220 lines. I had it trimmed to about 500 words
and the detail relocated rather than deleted: data model, rules,
performance and seed into `design.md`, the detailed done-when lines into a
new `acceptance-criteria.md`. Nothing was dropped.

This was partly Claude's doing and partly mine. It wrote a requirements
document containing an employee field table and a salary-change field
table, then wrote `design.md` containing the same information as a SQL
schema — duplication it created and did not notice, and which I accepted
at the time. A requirements document should say what the product must do;
field types belong in design. Neither of us caught the category error
until the page limit forced it.

**2. Audit wording.** The requirements promised "who changed a record,
what did they change, and when" among the questions the product must
answer, while the plan had the audit view as a *Could*. That is promising
something the build might not deliver. Corrected to: the Must-level
answer is salary history plus who last changed the record and when; the
full per-field change history is explicitly a Could. Salary history moves
up from Should to Must as a result.

Claude graded salary history as a *Should* in step A and I accepted it
then. That was wrong, and the inconsistency is the proof: "how has their
pay changed over time" is the first question in the requirements, so it
cannot sit below the line. It flagged this as its own mis-grading when I
raised it.

**3. Hosting.** I checked Fly.io: mounting a volume needs a valid payment
method on the account, which I am not adding for an assessment. Switched
to no persistent disk, with the seed running at boot when the database is
empty.

The trade-off is now stated outright in `design.md` section 9 rather than
hidden: data resets on every redeploy and restart, and the first load
after a free host sleeps pays container start plus migrations plus seed.
It is acceptable here because there is no login and no real salary data —
this is a demo over reproducible fixtures, not a system of record. Claude
added one consequence I had not thought through: the seed is no longer a
build-time statistic but the HR manager's wait on every cold start, so it
now carries a ~2 second budget in the design and on the plan. It also
pointed out that the seed's empty-check guard, written for the volume
plan, is not wasted — it is what makes adding a disk later a
configuration change rather than a code change.

**What Claude got right that I should keep doing.** It applied changes 2
and 3 immediately and held only change 1 for review, because that was the
only one where I had asked to see the result first. It also flagged that
my commit order leaves a link from `requirements.md` to `design.md`
dangling for exactly one commit. I judged that not worth reordering for,
but I would rather be told.

---

## Slice 0 — repo setup (2026-11-23)

**What I asked.** Start slice 0 and stop before the Dockerfile.

**What was built.** npm workspaces (`server`, `web`), TypeScript strict
with `noUncheckedIndexedAccess`, eslint flat config, Prettier, Vitest, and
a GitHub Actions workflow running lint, format, typecheck and test.

**Decisions worth recording.**

- **TypeScript pinned to 5.9.3, not the current 7.0.2.** Claude checked
  the registry before installing and found that `typescript-eslint`'s
  latest release (8.73.0) declares `typescript: ">=4.8.4 <6.1.0"`, with no
  v9 published. Taking TypeScript 7 would have meant no type-aware
  linting. Pinned with `~` so patches still arrive. Worth revisiting after
  the assessment.
- **CI runs Node 26, matching the development machine**, rather than the
  22 first written. CI that does not mirror the machine the code was
  written on is a trap, and `@types/node` had resolved to 26.
- **Prettier ignores `docs/`.** The prose there is hand-wrapped for
  reading; letting Prettier reflow it would churn every documentation
  commit for no benefit. Prettier governs code, not writing.
- **The "trivial test to prove the wiring" became a real one.** Rather
  than an `expect(true).toBe(true)`, the first test drives
  `formatEmployeeCode`, which the seed and the add-employee form both need
  later. Written test-first: the failing run was module-not-found, then
  the minimum implementation, then green. Four tests, 169 ms.
- **`.DS_Store` untracked** and added to `.gitignore`, along with
  `.claude/settings.local.json`.

**Where Claude was wrong.** Every dependency version it wrote into the
first `package.json` was stale — Vitest `^2` against a current `5.1.1`,
eslint `^9` against `10.15.0`, `@types/node` `^22` against `26.6.6`. The
resulting install reported six vulnerabilities, two of them critical, and
two packages with unapproved install scripts. It had guessed from memory
instead of asking the registry. It did check before the second attempt,
and a clean reinstall at current versions reports zero vulnerabilities and
no install-script warnings — but the right order was registry first,
`package.json` second, and I would not have caught the stale pins myself.

Two further npm stumbles on the way: `npm install -D <pkg>` honoured the
existing caret ranges instead of fetching latest, and then a leftover
`node_modules` tree produced a peer-dependency conflict on `vite`. Both
were resolved by deleting `node_modules` and `package-lock.json` and
installing fresh. Cheap to fix, but it cost a few minutes of an evening
that does not have many.

**Still open at the end of the slice.** There is no git remote, so the CI
workflow is committed but has never run. All four of its stages pass
locally. CI cannot be called green until the repository is pushed.
