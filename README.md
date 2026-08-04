# Bot Studio

A browser-based workspace for the Telegram Bot API: search methods, build request payloads from an auto-generated form (or a visual builder for nested types like inline keyboards), and send test calls straight to Telegram. Everything runs client-side — your bot token is only ever used to call `https://api.telegram.org` directly from your browser and is never stored or sent anywhere else.

## Features

- Search and browse the full Telegram Bot API method list.
- Auto-generated parameter forms, plus a visual builder for nested/union types (keyboards, media, entities, ...).
- Form fields and the raw request JSON stay in sync — edit either one.
- Send requests to Telegram directly from the browser and inspect the response.
- The schema stays current on its own: an hourly check for changes to Telegram's docs keeps the app up to date automatically.
