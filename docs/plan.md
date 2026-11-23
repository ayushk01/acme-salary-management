# Plan

Thin vertical slices. Each one ends with something that runs, is tested
and is committed. Priorities come from [requirements.md](requirements.md),
the testable conditions from
[acceptance-criteria.md](acceptance-criteria.md), and the reasoning behind
each slice from [design.md](design.md).

The deadline is one evening, so the line that matters is the one after
slice 11: **everything above it ships, everything below it only if that
line is live and green.**

---

## Must — the product is not demoable without these

### 0. Repo setup

- [ ] npm workspaces (`server`, `web`), TypeScript strict, eslint, prettier
- [ ] Vitest running, with one trivial passing test to prove the wiring
- [ ] GitHub Actions: lint, typecheck, test on push — green before slice 1

### 1. Deploy a hello-world

- [ ] Multi-stage Dockerfile; Express serves `web/dist` and `/api/health`,
      port from `PORT` so the host stays swappable
- [ ] Deployed to a free tier with no disk; live URL responding
- [ ] Record the URL in the README

*First, not last. A container surprise should cost an hour now, not at
midnight.*

### 2. Pay rules (pure, TDD)

- [ ] Failing test: exactly 25% above the median is **not** outside range
- [ ] `isOutsideRange`, `OUTLIER_THRESHOLD_PERCENT`, `MIN_GROUP_SIZE`
- [ ] Money formatting across minor-unit 2 (INR) and 0 (JPY)

*No database yet. These are the rules the whole product is judged on and
they are testable in milliseconds.*

### 3. Database

- [ ] Drizzle schema for the six tables, migrations generated
- [ ] Migrations run at boot; WAL and foreign keys on
- [ ] Reference data: countries with currency and minor unit, job titles,
      departments
- [ ] `:memory:` test helper that builds a database with ~10 known rows

### 4. Seed

- [ ] Fixed-seed PRNG, no dependency, no `Math.random`
- [ ] 10,000 employees in one transaction, timed, time printed
- [ ] Guarded: runs only when the employees table is empty
- [ ] Includes leavers, salary history, and deliberate outliers in groups
      of at least 5
- [ ] Test: two runs of the seed produce identical data
- [ ] **Boot budget: migrate + seed under ~2s** — it runs on every cold
      start now, so this is the HR manager's wait, not a build statistic

### 5. List API

- [ ] `GET /api/employees` — search, filters, sort, paging, `{ rows, page,
      pageSize, total }`
- [ ] `GET /api/reference` for the dropdowns
- [ ] Zod validation at the boundary, shared error shape
- [ ] Tests: leavers hidden by default, filters combine, paging arithmetic

### 6. List UI

- [ ] react-router; `/employees` with filters in the query string
- [ ] Table, search box, filter dropdowns, pager, sort by name or salary
- [ ] "Include left" toggle
- [ ] "Your name" prompt, held for the session, sent as `X-Changed-By`

*First slice the HR manager could actually use. Deploy it.*

### 7. Add, edit, mark as left

- [ ] `POST /api/employees`, `PATCH /api/employees/:code`,
      `POST /api/employees/:code/leave`
- [ ] A salary edit writes `salary_changes` and updates the employee in
      one transaction
- [ ] Left employees are read-only and leave the statistics
- [ ] Forms in the UI, with field-level errors from the API
- [ ] Tests: the two salary records stay in step; validation rejects a
      salary that is not a positive whole number

### 8. Salary history and last-changed

- [ ] `GET /api/employees/:code/salary-history`, newest first
- [ ] Employee page: current salary, then old → new, effective date,
      reason and who, per change
- [ ] Who last changed the record and when, from the employee's own
      `updated_at/by`
- [ ] Test: an employee with no changes shows no history rows

*This is the Must-level answer to "who changed this, and when". The full
per-field audit stays a Could — see slice 13.*

### 9. Country overview

- [ ] `GET /api/insights/country/:code` — headcount, min, max, average,
      median, in that country's currency
- [ ] Page showing all five
- [ ] Tests: median for odd and even counts; leavers excluded

### 10. Job overview

- [ ] `GET /api/insights/job/:id` — one row per country, never combined
- [ ] Page with a row per country
- [ ] Test: two countries with different currencies stay separate

### 11. CSV export

- [ ] `GET /api/employees.csv` — same filters, every matching row
- [ ] Chunked write, UTF-8 BOM, CRLF, salary as a number with currency
      beside it
- [ ] Export button on the list page, reusing the URL's filters
- [ ] Test: header row, and the row count matches the filtered total

**— Must list ends here. Deploy, check the live URL, commit. —**

---

## Should — build only once the Must list is live and green

### 12. Discrepancies

- [ ] `GET /api/insights/discrepancies?country=` using the outlier query
- [ ] Table: code, name, job title, salary, group median, percentage off
- [ ] Tests: groups under 5 skipped; exactly 25% not listed

---

## Could — only if everything above is finished

### 13. Full audit view

- [ ] `audit_events` table and per-edit field diffs
- [ ] Added / edited / salary changed / left, newest first

---

## Wrap-up — reserve the last 30 minutes

- [ ] README: live URL, how to run, the decisions and what was cut,
      including that data resets on redeploy
- [ ] Performance notes: boot and seed time, measured endpoint timings
- [ ] Final pass on `ai-log.md` and `prompts.md`
- [ ] 3–5 minute video outline

*These are a large part of what the reviewer actually sees. They do not
get squeezed by slice 13.*
