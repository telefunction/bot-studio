# Development

This document covers the project structure, available scripts, and the Telegram Bot API schema workflow for anyone building or contributing to Bot Studio. For a quick overview of the app itself, see [README.md](./README.md).

## Getting Set Up

```bash
npm install
npm run dev
```

This starts the Vite dev server. From there, the sections below cover the rest of the toolchain.

## Project Structure

```text
public/schema/bot-api.json     Canonical Telegram Bot API schema
docs/                          GitHub Pages build output
scripts/                       Schema update, normalize, and validation scripts
src/                           Vue application source
.github/workflows/             Hourly schema update workflow
```

## Commands

Start the development server:

```bash
npm run dev
```

Build the production site:

```bash
npm run build
```

`npm run build` validates the scripts/schema, type-checks the Vue app with `vue-tsc`, and builds the static output into `docs/`.

Preview the production build locally:

```bash
npm run preview
```

Lint and format the whole project:

```bash
npm run fix
```

This runs Prettier (`format`) followed by ESLint's autofix (`lint:fix`), so both formatting and auto-fixable lint issues are resolved in one command. See [Linting & Formatting](#linting--formatting) for details.

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

## Linting & Formatting

The project uses ESLint (`eslint.config.js`, flat config) for Vue 3 + TypeScript rules and Prettier (`.prettierrc.json`) for formatting. `eslint-config-prettier` disables ESLint's own stylistic rules so the two never fight over the same line.

```bash
npm run fix        # format + auto-fix everything (recommended before committing)
npm run lint       # check only, no changes
npm run format     # Prettier only
```

`src/components/TypeFieldEditor.vue` is listed in `.prettierignore`: it contains a template expression with a multi-param TS generic (`Record<string, unknown>`) inside a mustache, which trips Prettier's Vue template parser. ESLint still lints/fixes that file normally.

## Schema Workflow

`public/schema/bot-api.json` is the source of truth. Vite copies it into `docs/schema/bot-api.json` during build so GitHub Pages can serve the same schema used by the app.

To update manually:

```bash
npm run schema:update
npm run schema:normalize
npm run build
npm run validate:pages
```

### Automated Updates

The workflow at `.github/workflows/update-bot-api-schema.yml` runs every hour (`cron: "0 * * * *"`, plus manual `workflow_dispatch`). Each run:

1. Installs dependencies (`npm ci`).
2. Updates the schema (`npm run schema:update`).
3. Normalizes it (`npm run schema:normalize`).
4. Rebuilds the GitHub Pages output (`npm run build`).
5. Validates the Pages schema copy (`npm run validate:pages`).
6. Commits and pushes `public/schema/bot-api.json` and `docs/` only if something actually changed — otherwise the run exits without a commit.
