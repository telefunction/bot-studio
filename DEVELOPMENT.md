# Development

This document covers the available scripts and the Telegram Bot API schema workflow for anyone building or contributing to Bot Studio. For a quick overview of the app itself, see [README.md](./README.md).

## Getting Set Up

```bash
npm install
npm run dev
```

## Scripts

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

`public/schema/bot-api.json` is the source of truth; Vite copies it into `docs/schema/bot-api.json` on build.

An hourly GitHub Action checks Telegram's docs and commits `public/schema/bot-api.json` when it changes. That commit alone is enough to trigger the deploy workflow on push to `main`, which rebuilds and redeploys the site — no manual step needed.
