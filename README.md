# Bot Studio

A browser-based workspace for the Telegram Bot API. Search methods, build request payloads with an auto-generated form or a visual builder for nested types like inline keyboards, and send test calls straight to Telegram. Everything runs client-side: your bot token is used only to call `https://api.telegram.org` directly from your browser, and is never stored or sent anywhere else.

## Features

- Search and browse the full Telegram Bot API method list.
- Build requests with auto-generated parameter forms, plus a visual builder for nested/union types (keyboards, media, entities, ...).
- Keep form fields and the raw request JSON in sync by editing either one.
- Send requests to Telegram directly from the browser and inspect the response.
- Stay current automatically: an hourly check for changes to Telegram's docs keeps the schema up to date.
