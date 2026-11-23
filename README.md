# ACME Salary Management

Web software for ACME's HR team, who manage salary data for 10,000 employees
across eight countries and currently do it in Excel. It lets them find people,
keep salary records, and answer questions about how the organisation pays.

**Live:** https://acme-salary-management-zobo.onrender.com

**Demo video:** _to follow_

It runs on a free tier that puts the container to sleep when nobody is using
it. **The first load after a quiet spell can take up to a minute** while the
container starts and rebuilds its database. Everything after that is instant.

---

## Running it

Node 22.12 or newer.

```bash
npm ci --ignore-scripts
npm run build
node server/dist/index.js
```

`--ignore-scripts` because `better-sqlite3` ships prebuilt binaries but still
declares a `node-gyp` build step, which needs Python and a compiler. Any
install resolved from the lockfile runs it, so a plain `npm install` fails on
a machine without a toolchain — I checked, in the same slim image this
deploys to.

That serves the API and the UI together on http://localhost:3000, seeding
10,000 employees on the first start. For development with hot reload, run
`npm run dev --workspace @acme/server` and `npm run dev --workspace @acme/web`
in two terminals instead.

```bash
npm test          # 130 tests, under a second
npm run lint
npm run typecheck
```

All of these run in CI on every push.

---

## The questions it answers

| Question | Where |
| --- | --- |
| What does someone earn, and how has their pay changed? | **Employees** → click an employee code |
| How many people are in a country, and what do they earn? | **Pay by country** |
| What does a job title pay here and elsewhere? | **Pay by job title** |
| Who is paid outside their range? | **Outside range** |
| Who last changed a record, and when? | **Employees** → click a code → above the salary history |
| Find, add, edit, or mark someone as left | **Employees** |
| Get it into Excel | **Employees** → *Export CSV* |

Every filter lives in the URL, so a link carries exactly what you were
looking at.

---

## Decisions

Reasoning for all of these is in [docs/design.md](docs/design.md). The build
order is in [docs/plan.md](docs/plan.md), and the testable conditions behind
each feature in [docs/acceptance-criteria.md](docs/acceptance-criteria.md).

- **Money is integer minor units with an ISO currency code.** Never a float.
  `amount / 100` is the bug this rule exists to prevent.
- **No currency conversion.** Countries sit side by side in their own
  currencies; rates move daily and converting would mislead.
- **Currency hangs off the country, not the employee**, so a country's
  figures can never mix currencies.
- **Every aggregate is computed in SQL**, including the median, which SQLite
  has no built-in for — it comes from a window function.
- **Nothing is deleted.** People are marked as left; their record and history
  stay, and they leave every statistic.
- **Job titles, departments and countries are fixed lists.** Free text would
  split "SDE2" and "SDE 2" and break every grouped figure.
- **One Node process** serves the API and the React app. At this size there is
  nothing to gain from splitting them.

## What I cut

- **A full audit view** of every field change. The requirements promise who
  last changed a record and when, which is built; a per-field change log was
  always a *could*.
- **Excel import, login, approval workflows.** All in
  [docs/requirements.md](docs/requirements.md) with reasons.

---

## How I used AI

The product and design decisions are mine. The AI wrote code to my direction
and I reviewed it; it made small implementation calls as it went, which I
approved or reversed afterwards. The log shows which.

- [CLAUDE.md](CLAUDE.md) — the working agreement and engineering rules
- [docs/ai-log.md](docs/ai-log.md) — what I asked, what it proposed, what I
  accepted or rejected, and where it was wrong
- [docs/prompts.md](docs/prompts.md) — my prompts, word for word

Two places it was wrong that are worth reading:

1. **It checked the wrong command.** Before writing the database layer it
   verified `better-sqlite3` installed in the container's base image — but ran
   `npm install`, not the `npm ci` the Dockerfile actually runs. The check
   passed, the real build failed on a missing Python, and it would have broken
   the deploy on the next push. A check that does not run the real command is
   not a check.
2. **Its test expectations were wrong three slices running** while the
   production code was right: a rupee amount out by a factor of a hundred, a
   page ordered by insertion rather than by name, and a non-breaking space in
   a currency string. After that I reviewed every test table before the code
   existed, which is in CLAUDE.md as a standing rule.

---

## Performance

Measured against the seeded 10,000 employees, median of three warm requests.

| | |
| --- | --- |
| Employee list, any filter | 1–4 ms |
| Employee list, page 400 | 11 ms |
| Country overview | 3 ms |
| Job overview, 8 countries | 2 ms |
| Outside-range check, a whole country | 3 ms |
| CSV export, all 10,000 rows (1.19 MB) | 30 ms |
| Boot: migrations + seeding 10,000 | **313 ms** locally, **7.6–9.3 s** on the free tier |

The budget was 500 ms for list and insight queries, which everything meets
with room to spare. The boot budget was 2 seconds and the free tier misses it
by four times; that is recorded as the real number in
[docs/design.md](docs/design.md) rather than quietly restated.
`/api/health` reports the figure on every deploy.

## Known limits

- **Data resets when the container restarts.** There is no disk, so anything
  added or edited is lost on a redeploy or after the app sleeps. The seed is
  deterministic, so it is never empty — but it is a demo over fixtures, not a
  system of record.
- **No login.** "Who changed it" is a name typed once per session and trusted.
  This would be the first thing I added.
- **CSV cells are quoted but not formula-escaped.** A name beginning with
  `=`, `+`, `-` or `@` would be read by Excel as a formula. Prefixing those
  fields with a quote is the fix; it is not done.
