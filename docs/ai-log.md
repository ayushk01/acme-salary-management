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

**Closed after review.** I had Claude create the repository and push.
It created it **private** without being told to, on the reasoning that
publishing is outward-facing and hard to undo, and gave me the one-line
command to make it public when I am ready to share it. CI then ran on the
push and passed all four stages in 20 seconds, so slice 0 is green in fact
rather than only on my machine.

---

## Slice 1 — deploy a hello-world (2026-11-23)

**What I asked.** Deploy slice 1 to Render.

**What was built.** A multi-stage Dockerfile, `render.yaml`, an Express
app exposing `/api/health` and serving the built React app, a placeholder
React page that calls its own API, a README, and the GitHub Actions
versions bumped.

**Decisions worth recording.**

- **The SPA fallback deliberately excludes `/api/`.** Any GET that is not
  an API call and not a real file is handed `index.html` so client-side
  routing works. If `/api/` were not excluded, an unknown endpoint would
  return HTML with a 200, and a `fetch` would fail on parsing rather than
  on the status — a confusing bug to chase later. There is a test pinning
  `/api/does-not-exist` as a 404.
- **`createApp()` takes the static directory as an option.** Tests build
  the app without one, so the API can be tested without the React app
  having been built. The entry point is the only place that resolves
  paths.
- **Actions bumped from v4 to v7.** The first CI run warned that
  `actions/checkout@v4` and `actions/setup-node@v4` run on a deprecated
  Node 20. Claude had written v4 from memory and both were three majors
  stale — the same failure mode as the npm versions in slice 0. It
  checked the registry this time rather than guessing again.
- **No region pinned in `render.yaml`.** Claude suggested Singapore for
  latency, then dropped it rather than assert which regions the free plan
  allows. One line to add later if the demo feels sluggish.

**Where Claude was limited.** There is no Docker on this machine, so the
Dockerfile is the one artefact in this slice that has not been executed.
It said so plainly instead of implying the container was tested. What it
could verify, it did: `npm run build` produces both outputs, and the built
server serves `/api/health` as 200 JSON, `/` as the React shell,
`/employees` as the SPA fallback, and `/api/nope` as a 404. The container
layer itself gets its first real test on Render's builder.

**One thing it got right that I would not have thought of.** Express 5
changed its route matching, and the usual `app.get('*')` SPA fallback no
longer works. It used a plain middleware checking `req.path` instead,
which sidesteps the routing change entirely and is easier to read.

**Closed.** I deployed the Docker image to Render myself and gave Claude
the URL. It checked all four behaviours against the live site — health,
the React shell, the SPA fallback and the 404 on unknown API routes — and
they match what ran locally. I also installed OrbStack, so Docker is
available on this machine from here on; the Dockerfile is no longer the
one unverifiable artefact, which matters most at slice 3, where
`better-sqlite3` brings a native build into the image.

---

## Slice 2 — pay rules and money, test first (2026-11-23)

**What I asked.** Proceed with slice 2.

**What was built.** `server/src/domain/payRules.ts` with
`OUTLIER_THRESHOLD_PERCENT`, `MIN_GROUP_SIZE`, `isOutsideRange` and
`isGroupLargeEnough`; `web/src/money.ts` with `minorUnitsToDecimalString`
and `formatMoney`. Seventeen new tests, suite at 23 tests in 364 ms.

**Decisions worth recording.**

- **No float ever touches money.** The obvious `amountMinor / 100` is the
  implementation that quietly loses money, so the conversion to a decimal
  string is done with integer and string operations only, and the
  resulting string is handed to `Intl.NumberFormat`, which accepts one.
  The amount reaches the formatter intact.
- **`Intl` rather than a hand-rolled formatter**, because Indian grouping
  is 2,2,3 — ₹12,50,000 rather than ₹1,250,000 — and an HR manager in
  India would notice immediately. Writing that by hand to avoid a platform
  dependency would be the wrong trade.
- **Money formatting lives in `web/` only, and is not shared.** The CSV
  export in slice 11 will need the same minor-units-to-decimal conversion
  on the server. Claude proposed a third `shared/` workspace for it and I
  turned it down: a whole workspace with its own build for one five-line
  function, on the strength of a caller that does not exist yet. The
  decision gets revisited at slice 11, when there are two real callers.

**Where Claude was wrong, and where the tests earned their keep.**

- Its first INR test expected `formatMoney(1_250_000, 'INR')` to produce
  ₹12,50,000.00. That is wrong by a factor of a hundred — 1,250,000 *minor*
  units is ₹12,500.00, which is below where Indian grouping even begins, so
  the test would not have exercised the thing it was written to check. The
  implementation was right and the expectation was wrong. Exactly the
  mistake that integer minor units exist to prevent, made while writing the
  test for integer minor units, and caught in the red run.
- It wrote ` ` escapes into a regular expression and the literal
  characters landed in the file instead. ESLint's `no-irregular-whitespace`
  caught it. Replaced with `\s`, which is simpler and reads better anyway.
- It then took two attempts to name the type for Intl's string overload —
  `StringNumericLiteral`, then the correct `Intl.StringNumericLiteral`.
  Minor, but it had the error message in front of it the first time.

Three stumbles in one small slice, all caught by lint, types or tests
before I saw them. That is the argument for the harness being slice 0.

---

## Slice 3 — the container could not build (2026-11-23)

This surfaced while building the database slice, but it is a deployment
fault in its own right, so it is logged and committed on its own.

**The failure.** The image would not build.
`npm ci` runs `better-sqlite3`'s install script, which is `node-gyp
rebuild`, and that died looking for Python, which `node:26-slim` does not
carry. **This would have broken the Render deploy on the next push**, and
the previous two slices had deployed cleanly, so it would have looked like
the database work broke the deployment rather than the base image lacking
a toolchain.

It took two attempts to fix, because the first error pointed at the wrong
place. BuildKit builds independent stages in parallel and reported the
*runtime* stage's failure first, so Claude fixed only that one — and the
next build failed in the *build* stage, which it had assumed was fine. It
had read one error as evidence about the stage that had not reported yet.
Both stages run `npm ci`; both needed the flag.

The second puzzle was why `npm install better-sqlite3` succeeds in that
same image while `npm ci` fails. I asked Claude to check a specific
explanation rather than accept a vague one, and it holds up:

`better-sqlite3` ships a `binding.gyp`, which npm treats as "build this
with node-gyp" by default. The package opts out with `"gypfile": false`
in its `package.json` — it has no `install` script at all. Our
`package-lock.json` entry for it records neither `gypfile` nor
`hasInstallScript`. So an install resolved from the lockfile never sees
the opt-out, falls back to npm's binding.gyp default, and runs
`node-gyp rebuild`.

Three installs in the base image isolate it:

| Install | Lockfile | Result |
| --- | --- | --- |
| `npm install better-sqlite3` | none | success |
| `npm ci` | present | fails, `node-gyp rebuild` |
| `npm install` | present | also fails, `node-gyp rebuild` |

The third row is the one that matters: it is not the `npm ci` code path,
it is the lockfile. Any install resolved from the lock loses the opt-out.
Which also means a check that installs a package by hand, with no
lockfile, says nothing about what the real build will do — exactly the
mistake that made the earlier verification worthless.

Claude had checked the base image *before* writing any code, which was the
right instinct, but it checked `npm install better-sqlite3` rather than
the command the Dockerfile actually runs. That install found a prebuilt
binary and reported success, so the check passed while the real build
failed. A verification that does not run the real command is not a
verification, and it gave me false confidence for an hour.

The fix came from a second, sharper check: the package ships prebuilt
binaries for `linux-arm64`, `linux-x64` and others, and loads fine with
`--ignore-scripts`. So the runtime install now passes that flag, and the
image needs no Python and no compiler. Caught locally only because I had
installed OrbStack earlier in the evening — otherwise the first I would
have known was a red deploy.

**Verified by rebuilding.** The image builds and the container starts.
`--ignore-scripts` in the build stage did not disturb the Vite build.

---

## Slice 3 — database (2026-11-23)

**What I asked.** Push slice 2 and continue.

**What was built.** Drizzle schema for five tables, generated migrations,
a connection that sets the pragmas, reference data for countries, job
titles and departments, migrations running at boot, and a `:memory:` test
helper. Thirty tests, 452 ms.

**Decisions worth recording.**

- **`foreign_keys = ON` as a pragma at every connection.** SQLite has
  foreign keys off by default, so without this the references declared in
  the schema would be decoration rather than constraints. There is a test
  that inserts an employee into a country that does not exist and expects
  it to be rejected — otherwise this is exactly the kind of thing that
  looks right in the schema file and does nothing in production.
- **Synchronous queries in tests.** Drizzle's relational query API
  (`db.query.x.findMany()`) returns a promise even on a synchronous
  driver. Since `better-sqlite3` was chosen partly so tests need no async
  plumbing, the tests use `db.select().from(x).all()` instead, which
  really is synchronous.
- **Five tables, not the six the plan said.** The sixth is `audit_events`,
  which the design defers to the Could-level slice 13. Claude flagged the
  mismatch rather than ticking the box, and I reworded the plan.
- **The test helper is a factory, not a fixed fixture.** The plan called
  for "~10 known rows". A factory that defaults every field and lets a
  test override only what it is about is the reusable half; the specific
  ten rows depend on which aggregate is being checked, so they land with
  the first query that needs them rather than being guessed now. The plan
  is reworded to say so.

**Caught by reasoning rather than by testing.** The runtime image had to
carry `server/drizzle`: migrations run at boot, so the generated SQL has
to ship. That one would have failed at container start rather than at
build, which is a slower and more confusing way to find out.

**Verified by running the real thing.** The image builds, the container
starts, migrations create all five tables plus Drizzle's own bookkeeping
table, the eight countries load, and the API and React build are both
served. Migrations and reference data take **24 ms**, against the 2 second
boot budget the design sets for a cold start — comfortable, and a measured
number rather than an estimate.

Everything above was verified on arm64, while Render runs x64, so the
`--ignore-scripts` fix rested on `better-sqlite3` shipping a `linux-x64`
prebuild too. Claude could not confirm the deploy from outside — a failed
deploy leaves the previous container serving, and slice 3 changed nothing
observable through the API — so it said so instead of reading a 200 as
proof, and I confirmed it green in the Render dashboard myself.

---

## Slice 5 — the list API (2026-11-24)

**What I asked.** Apply the boot-time wording, note the sleep warning on
the README slice, commit the docs, then start slice 5.

**What was built.** `GET /api/employees` and `GET /api/reference` through
routes → services → repositories, with a pure paging module. Twenty-two
new tests, sixty-three in all, still under a second.

**Decisions worth recording.**

- **The total is its own count query**, not a `COUNT(*) OVER ()` window
  column. Against a synchronous in-process database the second query is
  almost free, and repeating the total on every row to save it reads
  worse. I let Claude make this call rather than stopping for it.
- **Ordering breaks ties on employee code.** Sorting by name alone is not
  a total order at 10,000 people, so two employees sharing a name could
  appear on two pages or on none. This is the kind of bug that shows up
  as "the list sometimes skips someone" weeks later.
- **LIKE wildcards in the search term are escaped** with an explicit
  ESCAPE clause. Without it, searching for "50%" matches everyone.
  Claude raised this unprompted; I would not have thought of it.
- **`createApp` now requires the database.** Making it optional would let
  a wiring mistake surface as silently missing routes instead of a type
  error. It cost a small edit to the existing health tests, which is the
  right trade.

**Measured, not assumed.** Against the seeded 10,000 employees the list
endpoint answers in 1.4 ms to 17 ms, against the 500 ms budget in
design.md. The slowest case is an unfiltered first page; the `LIKE`
search that no index can serve came in at 17 ms, so the FTS5 fallback the
design mentions stays unnecessary.

**Where Claude was wrong.** Two of its own test expectations were wrong
again, and in the same way as the rupee mistake in slice 2: asserting
what it assumed rather than what the code would do. It expected page two
of one to be the second employee *inserted*, when the default order is by
name — "Asha Rao, Emma Smith, Ravi Menon" puts the third insert second.
The implementation was right both times.

It also wrote a nonsense `afterEach` shim at the bottom of a test file,
reaching for a global instead of importing `afterEach` from vitest, and
caught it on re-reading before running anything. Worth noting because
nothing in the harness would have caught it as a *design* problem — it
would simply have failed, confusingly.

A pattern is forming: Claude's production code has been right nearly
every time, and its test expectations wrong three times out of three
slices. The tests still did their job, but it is the opposite of where I
would have expected the errors.

---

## Slice 4 — deterministic seed (2026-11-24)

**What I asked.** Approve CLAUDE.md with two edits, add the build commit
to `/api/health` as a tiny test-first step, then start slice 4.

**What was built.** A hand-written mulberry32 PRNG, a seed producing
10,000 employees and 6,912 salary changes in one transaction, the build
commit and database boot time on `/api/health`, and eleven new tests.
Forty-one tests, still under half a second.

**Decisions worth recording.**

- **The outlier group is constructed, not hoped for.** A random spread
  rarely leaves a clear case inside a group big enough to judge, and the
  discrepancies screen is worthless without one. So the seed builds SDE2
  in India explicitly: nine active people, two deliberate outliers, the
  rest clustered tightly so the median sits with the cluster. Everyone
  else varies by ±10%, which keeps ordinary employees from being mistaken
  for outliers.
- **Salary history is built backwards from the current salary.** Walking
  forwards from a starting figure would leave the newest change
  disagreeing with what the employee is actually paid. Building backwards
  makes that impossible by construction rather than by care.
- **Tests seed 300 employees, not 10,000.** Same code path, and the suite
  stays fast enough to run on every save. The 10,000 is asserted as a
  constant rather than by running it.
- **`/api/health` now reports the build commit and the boot time.**
  Before this, a failed deploy was invisible from outside: the previous
  container keeps serving and every endpoint answers exactly as before, so
  a 200 proved nothing. It proved its worth immediately — the next deploy
  was confirmed by reading `a561935` back from the live URL instead of
  asking me to open the dashboard.

**Where Claude was wrong.** On CLAUDE.md it argued for *leaving out* the
three design rules that start at later slices, on the grounds that a file
claiming to list rules we follow should not list rules we do not yet
follow. I told it to mark them with their slice instead. That is plainly
better — the rules are still visible to a future session, and the file
stays honest about what binds today. It had framed this as a binary
between honest-and-incomplete and complete-and-aspirational, and missed
the obvious third option.

**The new commit rule, first use.** Failing test and passing code as
separate commits worked cleanly, and Claude pointed out something I had
not considered: pushing both together means CI judges the green tip, so a
deliberately red commit never shows up as a failed run. That is now
written into CLAUDE.md.

---

## CLAUDE.md — late (2026-11-24)

`CLAUDE.md` was step D of my own order of work and should have been
written before any code. It was not: we went A, B, C and then straight to
repo setup and slices, and neither of us noticed for four slices. The
rules held anyway because they were restated in this conversation, which
is exactly the fragility step D existed to remove — a new session would
have had none of them. Claude flagged the omission at the end of slice 3;
I would rather it had been caught when we skipped it.
