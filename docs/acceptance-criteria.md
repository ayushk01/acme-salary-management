# Acceptance criteria

What "done" means for each feature in [requirements.md](requirements.md),
written so each line can be checked rather than argued about. The rules
these lean on (money, the outlier threshold, leavers, who-changed-it) are
defined in [design.md](design.md) section 3.

---

## Must

### Search, filter, sort, page

- Typing part of a name or an employee code filters the list — partial
  match, case-insensitive.
- Filters for country, job title, department and status combine: choosing
  "India" and "SDE2" shows only people who are both.
- The list shows 20 per page and reports the total, as "1–20 of 412".
- Sorting by name or by salary works in both directions.
- People who have left are hidden until "include left" is ticked.
- Paging, filtering and sorting happen on the server; the browser never
  receives more than one page.

### Add, edit, mark as left

- **Add**: a new employee with valid fields appears in the active list and
  is counted in their country's statistics.
- **Add**: invalid input is rejected with a message naming the field — a
  missing required field, or a salary that is not a positive whole number.
- **Add**: the employee code is unique; a duplicate is rejected.
- **Edit**: changing the salary records a salary change (old → new,
  effective date, reason, who) and the new amount is the one used in every
  statistic from that point.
- **Edit**: changing a non-salary field records no salary change.
- **Mark as left**: the employee disappears from the active list and from
  every statistic, their leaving date is recorded, their record and
  history stay viewable, and they can no longer be edited.
- Nothing is ever hard-deleted.

### Salary history and last-changed

- An employee's page shows their current salary and currency, then their
  salary history as dated rows, newest first, each with old → new amount,
  effective date, reason and who made the change.
- An employee with no changes since being added shows their starting
  salary and no history rows.
- The page shows who last changed the record and when.
- The effective date defaults to today and can be set to another date.

### Country pay overview

- Choosing "India" shows headcount and min, max, average and median — all
  four — in INR.
- Choosing "Germany" shows the same four figures in EUR.
- Someone marked as left is not counted in any of them.
- Figures from different countries are never added together.

### Job pay overview

- Choosing "SDE2" shows one row per country where we employ an SDE2, each
  with headcount, min, max, average and median in that country's currency.
- Countries are never combined into a single figure.
- A country with no active SDE2 does not appear.

### Export

- The Export button downloads a CSV of the current filtered list — every
  matching row, not just the page on screen.
- The file has a header row and one row per employee.
- Salary is a plain number in its own column, with the currency code in a
  separate column, so Excel treats it as a number.
- The file opens in Excel with columns intact and non-ASCII names
  displayed correctly.

---

## Should

### Discrepancies (outside range)

- Choosing "India" shows a table of employee code, name, job title,
  salary, the group median and the percentage above or below it.
- Only groups with at least 5 active employees appear.
- Someone **exactly** 25% above the median is not listed; the rule is
  *more than* 25%.
- Someone 25.01% above is listed.
- Each row's figures are in that country's own currency.

---

## Could

### Full audit view

- An employee's page lists, newest first: added, each edit with the fields
  that changed, each salary change, and marked as left — each with what
  changed, when and who.

---

## Across the whole product

- Search and list results return in under 500 ms at 10,000 employees.
- Every aggregate is computed by the database, not in JavaScript.
- Money is never a float and is never converted between currencies.
- Validation happens at the API boundary and every error has the same
  shape.
- Every question in requirements.md is answerable in at most three clicks
  from the home screen.
