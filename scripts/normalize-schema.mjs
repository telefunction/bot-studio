import { readFile, writeFile } from 'node:fs/promises';

const schemaPath = new URL('../public/schema/bot-api.json', import.meta.url);

function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'returnType')
        .map(([key, entry]) => [key, normalize(entry)]),
    );
  }
  if (typeof value === 'string') return decodeEntities(value);
  return value;
}

const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
await writeFile(schemaPath, `${JSON.stringify(normalize(schema), null, 2)}\n`, 'utf8');
console.log('Normalized schema text.');
