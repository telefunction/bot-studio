import { readFile, writeFile } from 'node:fs/promises';
import { decodeEntities } from './lib/entities.mjs';

const schemaPath = new URL('../public/schema/bot-api.json', import.meta.url);

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalize(entry)]));
  }
  if (typeof value === 'string') return decodeEntities(value);
  return value;
}

const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
await writeFile(schemaPath, `${JSON.stringify(normalize(schema), null, 2)}\n`, 'utf8');
console.log('Normalized schema text.');
