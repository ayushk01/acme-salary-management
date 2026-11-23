# Requirements: ACME Salary Management

## Problem

ACME's HR team manages salary data for 10,000 employees across many
countries in Excel. It is slow, error-prone and hard to trust. This is web
software that lets them manage that data and answer questions about how
the organisation pays its people.

## User

The HR manager and a small HR team. Non-technical, sometimes working at
the same time. They care about finding people fast, trusting the numbers,
and getting data out into Excel.

## Questions it must answer

1. What does an employee earn, and how has their pay changed over time?
2. How many people do we employ in a country, and what is the
   min / max / average / median salary there?
3. What do people with the same job title earn in one country, and in
   others?
4. Who is paid outside their range?
5. Who last changed a record, and when?
6. How do I find, add, edit or mark someone as left?
7. How do I get this into Excel?

## Features

**Must**

- Employee list: search by name or code, filter by country, job title,
  department and status, sorted and paged.
- Add, edit, and mark an employee as left. Nothing is ever deleted.
- Salary history for an employee: old → new, date, reason and who, plus
  who last changed the record.
- Country pay overview: headcount and min / max / average / median in that
  country's currency.
- Job pay overview: the same figures per country for one job title.
- Export the current filtered list as CSV that opens in Excel.

**Should**

- Discrepancies: who is paid outside the range for their job in their
  country.

**Could**

- Full audit view: every edit with the individual fields that changed.

Testable conditions are in [acceptance-criteria.md](acceptance-criteria.md).
The data model, rules, performance budgets and seed are in
[design.md](design.md).

## Out of scope, and why

- **Payroll** — payments, tax, attendance, per-country rules: a different
  product.
- **Login and roles** — salary data is sensitive and this is the first
  thing I would add next. It does not change the data model, so v1 assumes
  trusted internal users.
- **Approval workflows** — need roles first.
- **Excel import** — high value, because they live in Excel, but safe
  import needs column mapping and an error report. The seed provides data
  for now; export is in.
- **Currency conversion** — rates move daily and converting misleads. HR
  compares pay within a country, so currencies sit side by side.
- **Moving an employee between countries** — changes their currency and
  makes their history incomparable.
- **Gender and diversity data** — sensitive, needs legal review, not
  collected.

## Assumptions

- One organisation. Salary is annual gross in the employee's local
  currency.
- Each country has exactly one currency, and an employee's comes from
  their country.
- Trusted internal users, so "changed by" is a name the user types once
  per session.
- Outside range means more than 25% from the median for the same job title
  in the same country, in groups of at least five. These numbers are my
  choice, not ACME policy, and live in one place in the code.

## Done means

- Deployed, usable, and seeded with 10,000 employees.
- Every question above answerable in at most three clicks.
- The pay rules and the statistics covered by fast, deterministic tests,
  including the boundary cases.
