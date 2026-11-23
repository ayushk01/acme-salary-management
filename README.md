# ACME Salary Management

Web software for ACME's HR team to manage salary data for 10,000 employees
across many countries, and to answer questions about how the organisation
pays its people.

**Live URL:** _not deployed yet — added when slice 1 reaches Render._

---

## Running it locally

Node 22.12 or newer.

```bash
npm install
npm run dev --workspace @acme/server   # API on :3000
npm run dev --workspace @acme/web      # UI on :5173, proxying /api to :3000
```

In production a single Express process serves both the API and the built
React app, so the `/api` paths are identical either way.

### Checks

```bash
npm run lint
npm run format
npm run typecheck
npm test
```

All four run in CI on every push.

### Production build

```bash
npm run build
node server/dist/index.js
```

---

## Documentation

| Document | What it holds |
| --- | --- |
| [docs/requirements.md](docs/requirements.md) | What the product must do, in one page |
| [docs/acceptance-criteria.md](docs/acceptance-criteria.md) | Testable conditions per feature |
| [docs/design.md](docs/design.md) | Architecture, data model, rules, trade-offs, performance, deployment |
| [docs/plan.md](docs/plan.md) | Build order as thin vertical slices |
| [docs/ai-log.md](docs/ai-log.md) | How AI was used, and where it was wrong |
| [docs/prompts.md](docs/prompts.md) | The prompts behind each step, word for word |

---

## Shape of it

```
server/   Express API. routes -> services -> repositories, plus a pure domain layer
web/      React app, built by Vite and served by the same Express process
```

Decisions worth knowing before reading the code:

- **Money is never a float.** Integer minor units with an ISO currency code,
  and no conversion between currencies — a country's figures stay in that
  country's currency.
- **Aggregates are computed in SQL**, including the median, which SQLite
  has no built-in for.
- **Nothing is hard-deleted.** Employees are marked as left; their history
  stays.
- **No persistent disk.** The database is rebuilt from a deterministic seed
  when it is empty, so edits do not survive a redeploy. The reasoning is in
  [docs/design.md](docs/design.md) section 9.
