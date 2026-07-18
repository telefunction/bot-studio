# Bot Studio

Bot Studio is a browser-based Telegram Bot API workspace for exploring methods, building request payloads, and sending test calls directly to Telegram. It runs entirely client-side — your bot token is only ever used to call `https://api.telegram.org` directly from your browser and is never stored or sent anywhere else.

## Features

- Search and browse generated Telegram Bot API methods.
- Generate parameter forms from the local Bot API schema.
- Edit either form fields or the request JSON and keep both in sync.
- Preserve custom request JSON keys that are not part of the selected method form.
- Send requests directly to Telegram from the browser.
- View and copy request/response JSON.
- Build static output into `docs/` for GitHub Pages.
- Update the Telegram Bot API schema manually or on an hourly GitHub Action.

## Tech Stack

- Vue 3
- TypeScript
- Vite
- Tailwind CSS
- Lucide icons

## Learn More

See [DEVELOPMENT.md](./DEVELOPMENT.md) for the full script reference, project structure, and schema-update workflow.
