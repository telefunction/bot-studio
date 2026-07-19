import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const source = 'https://core.telegram.org/bots/api';
const outputPath = new URL('../public/schema/bot-api.json', import.meta.url);
const outputDir = new URL('../public/schema/', import.meta.url);
const checkOnly = process.argv.includes('--check');
const generatedBy = 'scripts/update-telegram-schema.mjs';
const minimumMethodCount = 50;
const minimumTypeCount = 100;
const requestTimeoutMs = 20_000;

function text(value) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isMethodName(value) {
  return /^[a-z][A-Za-z0-9]+$/.test(value);
}

function isTypeName(value) {
  return /^[A-Z][A-Za-z0-9]+$/.test(value);
}

// Method parameter tables are "Parameter | Type | Required | Description" (4 columns). Object/type
// field tables have no Required column at all — just "Field | Type | Description" (3 columns).
// Telegram instead marks an optional *type* field by prefixing its description with "Optional.".
// Getting this wrong silently discards every type field's real description into the (nonexistent)
// Required column, which is why every type's fields used to render with blank descriptions.
function parseRows(block, { isType = false } = {}) {
  const tableMatch = block.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return [];

  const rows = Array.from(tableMatch[0].matchAll(/<tr[\s\S]*?<\/tr>/gi))
    .slice(1)
    .map(([row]) => Array.from(row.matchAll(/<td[\s\S]*?<\/td>/gi)).map(([cell]) => text(cell)));

  if (isType) {
    return rows
      .filter((cells) => cells.length >= 3)
      .map(([name, type, ...description]) => {
        const descriptionText = description.join(' ').trim();
        return {
          name,
          type,
          required: !/^optional\b/i.test(descriptionText),
          description: descriptionText,
        };
      });
  }

  return rows
    .filter((cells) => cells.length >= 4)
    .map(([name, type, required, ...description]) => ({
      name,
      type,
      required: required.toLowerCase() === 'yes',
      description: description.join(' '),
    }));
}

function parseDocs(html) {
  const headingPattern = /<h([34])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings = Array.from(html.matchAll(headingPattern)).map((match) => ({
    index: match.index || 0,
    raw: match[0],
    level: Number(match[1]),
    title: text(match[2]),
  }));

  const methods = [];
  const types = [];
  let category = 'Telegram Bot API';

  headings.forEach((heading, index) => {
    const next = headings[index + 1]?.index ?? html.length;
    const block = html.slice(heading.index + heading.raw.length, next);
    const title = heading.title;

    if (heading.level === 3) {
      category = title;
      return;
    }

    if (heading.level !== 4 || (!isMethodName(title) && !isTypeName(title))) return;

    const paragraphs = Array.from(block.matchAll(/<p[\s\S]*?<\/p>/gi))
      .slice(0, 4)
      .map(([paragraph]) => text(paragraph))
      .filter(Boolean);
    const description = paragraphs.join(' ');
    const officialUrl = `${source}#${slug(title)}`;
    // isMethodName/isTypeName are mutually exclusive (method names start lowercase, type names
    // uppercase) and the heading was already filtered to match one of them above, so "not a
    // method" here is always "a type".
    const rows = parseRows(block, { isType: !isMethodName(title) });

    if (isMethodName(title)) {
      methods.push({
        name: title,
        category,
        description,
        parameters: rows,
        officialUrl,
      });
      return;
    }

    types.push({
      name: title,
      category,
      description,
      fields: rows,
      officialUrl,
    });
  });

  const uniqueMethods = [...new Map(methods.map((item) => [item.name, item])).values()];
  const uniqueTypes = [...new Map(types.map((item) => [item.name, item])).values()];

  return {
    source,
    fetchedAt: new Date().toISOString(),
    generatedBy,
    methodCount: uniqueMethods.length,
    typeCount: uniqueTypes.length,
    methods: uniqueMethods,
    types: uniqueTypes,
  };
}

function comparableSchema(schema) {
  const { fetchedAt, ...stableSchema } = schema;
  return JSON.stringify(stableSchema);
}

function assertSchema(schema) {
  if (schema.methods.length < minimumMethodCount) {
    throw new Error(
      `Parser produced too few methods (${schema.methods.length}). Telegram docs may have changed.`,
    );
  }

  if (schema.types.length < minimumTypeCount) {
    throw new Error(
      `Parser produced too few types (${schema.types.length}). Telegram docs may have changed.`,
    );
  }

  if (schema.methodCount !== schema.methods.length || schema.typeCount !== schema.types.length) {
    throw new Error('Schema counts do not match parsed method/type arrays.');
  }
}

async function fetchDocs() {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const response = await fetch(source, {
        headers: { 'user-agent': 'BotStudioSchemaUpdater/0.2 (+https://github.com)' },
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Failed to fetch ${source}: ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(attempt * 1_000);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

async function main() {
  const schema = parseDocs(await fetchDocs());
  assertSchema(schema);

  const currentJson = await readFile(outputPath, 'utf8').catch(() => '');
  const currentSchema = currentJson ? JSON.parse(currentJson) : null;
  const changed = !currentSchema || comparableSchema(currentSchema) !== comparableSchema(schema);

  const nextJson = `${JSON.stringify(schema, null, 2)}\n`;
  if (checkOnly) {
    if (changed) {
      console.error('Telegram Bot API schema is out of date. Run npm run schema:update.');
      process.exit(1);
    }
    console.log('Telegram Bot API schema is up to date.');
    return;
  }

  if (!changed) {
    console.log(
      `Telegram Bot API schema is already current (${schema.methodCount} methods, ${schema.typeCount} types).`,
    );
    return;
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, nextJson, 'utf8');
  console.log(`Wrote ${schema.methodCount} methods and ${schema.typeCount} types.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
