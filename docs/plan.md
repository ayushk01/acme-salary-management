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

- [x] npm workspaces (`server`, `web`), TypeScript strict, eslint, prettier
- [x] Vitest running, with one trivial passing test to prove the wiring
- [x] GitHub Actions: lint, typecheck, test on push — green before slice 1

### 1. Deploy a hello-world

- [x] Multi-stage Dockerfile; Express serves `web/dist` and `/api/health`,
      port from `PORT` so the host stays swappable
- [x] Deployed to a free tier with no disk; live URL responding
- [x] Record the URL in the README

*First, not last. A container surprise should cost an hour now, not at
midnight.*

### 2. Pay rules (pure, TDD)

- [x] Failing test: exactly 25% above the median is **not** outside range
- [x] `isOutsideRange`, `OUTLIER_THRESHOLD_PERCENT`, `MIN_GROUP_SIZE`
- [x] Money formatting across minor-unit 2 (INR) and 0 (JPY)

*No database yet. These are the rules the whole product is judged on and
they are testable in milliseconds.*

### 3. Database

- [x] Drizzle schema for the five tables (`audit_events` only if slice 13
      is reached), migrations generated
- [x] Migrations run at boot; WAL and foreign keys on
- [x] Reference data: countries with currency and minor unit, job titles,
      departments
- [x] `:memory:` test helper and an employee factory; the fixed fixture
      set lands with the first aggregate that needs it

### 4. Seed

- [x] Fixed-seed PRNG, no dependency, no `Math.random`
- [x] 10,000 employees in one transaction, timed, time printed
- [x] Guarded: runs only when the employees table is empty
- [x] Includes leavers, salary history, and deliberate outliers in groups
      of at least 5
- [x] Test: two runs of the seed produce identical data
- [ ] **Boot budget: migrate + seed under ~2s** — it runs on every cold
      start now, so this is the HR manager's wait, not a build statistic

### 5. List API

- [x] `GET /api/employees` — search, filters, sort, paging, `{ rows, page,
      pageSize, total }`
- [x] `GET /api/reference` for the dropdowns
- [x] Zod validation at the boundary, shared error shape
- [x] Tests: leavers hidden by default, filters combine, paging arithmetic

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

- [x] `GET /api/employees/:code/salary-history`, newest first
- [x] Employee page: current salary, then old → new, effective date,
      reason and who, per change
- [x] Who last changed the record and when, from the employee's own
      `updated_at/by`
- [x] Test: an employee with no changes shows no history rows

*This is the Must-level answer to "who changed this, and when". The full
per-field audit is cut — see the Cut section.*

### 9. Country overview

- [x] `GET /api/insights/country/:code` — headcount, min, max, average,
      median, in that country's currency
- [x] Page showing all five
- [x] Tests: median for odd and even counts; leavers excluded

### 10. Job overview

- [ ] `GET /api/insights/job/:id` — one row per country, never combined
- [ ] Page with a row per country
- [ ] Test: two countries with different currencies stay separate

### 11. CSV export

- [ ] `GET /api/employees.csv` — same filters, every matching row
- [ ] Chunked write, UTF-8 BOM, CRLF, salary as a **plain number** with the
      currency code in its own column — never formatted money, so Excel
      treats the column as numeric and can total or sort it
- [ ] Export button on the list page, reusing the URL's filters
- [ ] Test: header row, and the row count matches the filtered total

**— Must list ends here. Deploy, check the live URL, commit. —**

---

## Should — only if time is left after the README and the video

### 12. Discrepancies

- [ ] `GET /api/insights/discrepancies?country=` using the outlier query
- [ ] Table: code, name, job title, salary, group median, percentage off
- [ ] Tests: groups under 5 skipped; exactly 25% not listed

---

## Cut

### 13. Full audit view — **not being built**

`audit_events` and per-edit field diffs. The Must-level answer to "who
changed this and when" ships in slice 8 (salary history plus
last-changed-by/at), which is what the requirements promise. A complete
per-field change history was always a *Could*, and the time is better
spent on the README and the video.

---

## Wrap-up — reserve the last 30 minutes

- [ ] README: live URL, how to run, the decisions and what was cut,
      including that data resets on redeploy and that the first load after
      the app sleeps can take up to a minute on the free tier
- [ ] Performance notes: boot and seed time, measured endpoint timings
- [ ] Final pass on `ai-log.md` and `prompts.md`
- [ ] 3–5 minute video outline

*These are a large part of what the reviewer actually sees. They do not
get squeezed by slice 13.*
