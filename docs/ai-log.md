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
