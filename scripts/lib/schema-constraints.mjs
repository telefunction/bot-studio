// Shared by the schema fetcher and the pre-build validator so a Telegram docs-format
// change can't silently produce a near-empty schema that still passes validation.
export const MIN_METHOD_COUNT = 50;
export const MIN_TYPE_COUNT = 100;
