# Contributing

Glad you're interested — we'd love your help improving Bot Studio.

## Setup Workflow

```bash
npm install
npm run dev
```

| Command                    | Description                                                            |
| -------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`              | Start Vite dev server.                                                 |
| `npm run build`            | Validate scripts/schema, type-check Vue, and build into `docs/`.       |
| `npm run preview`          | Preview the built site locally.                                        |
| `npm run fix`              | Format with Prettier, then auto-fix with ESLint.                       |
| `npm run format`           | Format all files with Prettier.                                        |
| `npm run lint`             | Check all files with ESLint (no changes).                              |
| `npm run lint:fix`         | Check with ESLint and auto-fix what it can.                            |
| `npm run validate`         | Validate the canonical schema in `public/schema/bot-api.json`.         |
| `npm run validate:pages`   | Validate that `docs/schema/bot-api.json` matches the canonical schema. |
| `npm run schema:update`    | Fetch and regenerate the Telegram Bot API schema.                      |
| `npm run schema:check`     | Check whether the local schema is current.                             |
| `npm run schema:normalize` | Normalize schema text and remove unsupported legacy fields.            |

## Schema Workflow

`src/` holds the app: `components/` for Vue components, `composables/` for shared reactive logic, `lib/` for framework-agnostic helpers, and `types/` for shared TypeScript types. `public/schema/bot-api.json` is the canonical, auto-generated Telegram Bot API schema the app reads at runtime; Vite copies it into `docs/schema/bot-api.json` on build. The `scripts/` directory fetches and normalizes that schema, and an hourly GitHub Action keeps it current — a schema-changing commit alone is enough to trigger the deploy workflow on push to `main`, no manual step needed.

## Contribution Workflow

Branch off `main`, commit using [Conventional Commits](https://www.conventionalcommits.org/), and open a pull request.
