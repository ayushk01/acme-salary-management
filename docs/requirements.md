# Requirements: ACME Salary Management

## 1. Problem

- ACME's HR team manages salary data for 10,000 employees.
- The employees are spread across different countries.
- They manage everything in Excel, which is tedious.
- We're building web-based software so the HR team can answer questions
  about how the organisation pays its people, quickly and with confidence.

## 2. User

- HR manager and a small HR team. Non-technical.
- Several of them may use it at the same time.
- What they care about: finding people fast, trusting the numbers,
  getting data out into Excel.

## 3. Questions the product must answer

- What does employee X earn, and how has it changed over time?
- How many people do we employ in country C, and what is the
  min/max/average/median salary there?
- What do people with the same job title earn within a country, and in
  other countries?
- Who is paid outside their range (rule in section 6)?
- Who changed a record, what did they change, and when?
- Basic: search, add, edit, mark an employee as left.
- Export: download the current filtered list as a CSV that opens in Excel.

## 4. Data

### 4.1 Employee

| Field         | Notes                                                        |
| ------------- | ------------------------------------------------------------ |
| Employee code | Unique, format `EMP00001`. The identifier HR uses; at 10,000 people names are not unique. |
| Full name     | Required.                                                     |
| Email         | Required.                                                     |
| Job title     | From the fixed list.                                          |
| Department    | From the fixed list. Used as a filter only; no department statistics in v1. |
| Country       | From the fixed list. The country sets the employee's currency. |
| Salary        | Annual gross, in the country's currency.                      |
| Hire date     | Required.                                                     |
| Status        | Active or left.                                               |
| Date left     | Recorded when the employee is marked as left; empty otherwise. |

### 4.2 Salary change

Recorded every time a salary is changed:

| Field          | Notes                                         |
| -------------- | --------------------------------------------- |
| New amount     | In the country's currency.                    |
| Effective date | Defaults to today; can be set to another date. |
| Reason         | Raise, promotion or correction.               |
| Changed by     | The name entered for the session.             |
| Changed at     | When the change was saved.                    |

### 4.3 Fixed lists

Country, job title and department come from fixed dropdown lists, never
free text. Free text would split "SDE2" and "SDE 2" into two groups and
quietly break every statistic.

Each country has exactly one currency. An employee's currency comes from
their country, so a country's statistics can never mix currencies.

## 5. Features (MVP)

Priority is **Must** (ships tonight), **Should** (ships if the Must list
is done and solid), **Could** (only if everything else is finished).

- **Basic read: search, filter, sort** — *Must*\
  As an HR manager, I can find an employee by name or employee code, and
  filter the list by country, job title, department and status.\
  **Done when**: typing part of a name or code filters the list
  (partial, case-insensitive); filters combine; the list shows 20 per
  page and can be sorted by name or salary; people who have left are
  hidden until "include left" is ticked.

- **Basic update: add, edit, mark as left** — *Must*\
  As an HR manager, I can add an employee, edit one, and mark one as
  having left instead of deleting them, so their salary history and audit
  trail stay intact.\
  **Done when (add)**: a new employee with valid fields appears in the
  active list and is counted in their country's statistics; invalid input
  (missing required field, salary that isn't a positive whole number) is
  rejected with a message naming the field.\
  **Done when (edit)**: changing the salary records a salary change (old
  → new, effective date, reason, who), and the new amount is the one used
  in all statistics.\
  **Done when (mark as left)**: the employee disappears from the active
  list and from every statistic, their date left is recorded, their
  record and history stay viewable, and they can no longer be edited.

- **Country pay overview** — *Must*\
  As an HR manager, I can pick a country and see its headcount and
  min/max/average/median salary in that country's currency, so I
  understand how we pay people there.\
  **Done when**: choosing "India" shows headcount and all four figures in
  INR; someone marked as left is not counted; choosing "Germany" shows
  the same four figures in EUR.

- **Job pay overview** — *Must*\
  As an HR manager, I can pick a job title and see what that job pays in
  each country where we employ it.\
  **Done when**: choosing "SDE2" shows one row per country, each with
  headcount, min, max, average and median in that country's currency.
  Countries are never added together into a single figure.

- **Export** — *Must*\
  As an HR manager, I can export what I am looking at and open it in Excel.\
  **Done when**: the Export button downloads a CSV of the current
  filtered list — every matching row, not just the page on screen — with
  a header row, salary as a plain number, and currency in its own column;
  it opens in Excel with the columns intact.

- **Discrepancies (outside range)** — *Should*\
  As an HR manager, I can see who is paid outside the range for their job
  in their country.\
  **Done when**: choosing "India" shows a table of employee code, name,
  job title, salary, the group median, and the percentage above or below
  it. Only groups with at least 5 active employees appear. Someone
  exactly 25% above the median is not listed (the rule is *more than*
  25%).

- **Employee pay overview (salary history)** — *Should*\
  As an HR manager, I can pick an employee and see their salary and how
  it has changed over time.\
  **Done when**: the employee's page shows their current salary and
  currency, and their salary history as dated rows, newest first, each
  with old → new amount, effective date, reason and who made the change.
  An employee with no changes since being added shows their starting
  salary and no history rows.

- **Audit view** — *Could*\
  As an HR manager, I can see who changed a record and when.\
  **Done when**: an employee's page lists, newest first: added, each
  salary change, each edit, and marked as left — each with what changed,
  when, and who.

## 6. Rules and definitions

- **Salary**: annual gross, in the employee's country's currency. Stored
  as a whole number of minor units with its ISO currency code; never a
  float, never converted between currencies.
- **Outside range**: paid more than 25% above or below the **median**
  salary for the same job title in the same country, each in its own
  currency. The median, not the average, because the average is dragged
  by the very outliers we are looking for. Groups with fewer than 5
  active employees are skipped — a group of one is always exactly at its
  own median.
- **People who have left**: excluded from every statistic and hidden from
  the list by default, shown with an "include left" toggle, and
  read-only. Their record, salary history and audit trail stay.
- **Who changed it**: there is no login in v1, so the user types their
  name once and it is remembered for the session and attached to every
  change they make.
- **Two people editing at once**: the last save wins. No locking, no
  merge.
- **Audit scope**: salary changes, plus added / edited / marked-as-left
  events, per employee. Not a general system that records every field of
  every table.

## 7. Performance and list behaviour

- Search and list results come back in under 500 ms at 10,000 employees.
- Paging, searching, filtering and sorting happen on the server, 20 rows
  per page. The browser never receives 10,000 rows.
- Statistics (count, min, max, average, median) are computed by the
  database, not in JavaScript.

## 8. Seed data

10,000 employees, generated from a fixed seed so the data is identical on
every run. It includes people who have left, salary history for a share of
employees, and some deliberate outliers in groups of at least 5, so the
discrepancies and history screens are not empty in the demo.

## 9. Out of scope (and why)

- **Payroll** — payments, tax, attendance and rules that differ per
  country: a different product.
- **Login and roles** — salary data is sensitive and this is the first
  thing I would add next. It doesn't change the data model, so v1 assumes
  trusted internal users.
- **Approval workflows** — need roles first, and aren't needed to answer
  the questions in section 3.
- **Excel import** — high value because they live in Excel, but doing it
  safely needs column mapping, validation and an error report. Deferred;
  the seed script provides the data for now. Export is in.
- **Currency conversion** — exchange rates change daily and converting can
  mislead. HR compares pay within a country, so v1 shows local currencies
  side by side.
- **Moving an employee between countries** — changes their currency, which
  makes their salary history incomparable. Needs a rule for how history is
  shown across a currency change; not in v1.
- **Gender and diversity data** — sensitive personal data that needs legal
  review; we don't collect it.

## 10. Assumptions

- One organisation.
- Salary is annual gross in the country's currency.
- Each country has exactly one currency.
- Trusted internal users, so "who changed it" is a name typed by the user.
- The ±25% rule, the median baseline and the minimum group size of 5 are
  my decisions, not ACME's policy. They are in one place in the code so
  they are easy to change.

## 11. Open questions

- Does the deployed data need to survive a redeploy, or is reseeding on
  start acceptable? Decide in the design step — it drives the hosting
  choice.

## 12. Done means

- Deployed and usable.
- Seeded with 10,000 employees.
- Every question in section 3 answerable in a few clicks — at most three
  from the home screen.
- The pay rules in section 6 and the statistics in section 5 are covered
  by unit tests, including the boundary cases (exactly 25%, group of
  fewer than 5, an employee who has left).
