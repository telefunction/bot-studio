import { readFile } from 'node:fs/promises';

const schemaPath = new URL('../public/schema/bot-api.json', import.meta.url);
const docsSchemaPath = new URL('../docs/schema/bot-api.json', import.meta.url);
const checkDocsSchema = process.argv.includes('--docs');

const schemaJson = await readFile(schemaPath, 'utf8');
const schema = JSON.parse(schemaJson);

if (!Array.isArray(schema.methods) || schema.methods.length === 0) {
  throw new Error('public/schema/bot-api.json must contain at least one method.');
}

if (!Array.isArray(schema.types) || schema.types.length === 0) {
  throw new Error('public/schema/bot-api.json must contain at least one type.');
}

if (
  schema.generatedBy === 'bot-studio bootstrap schema' ||
  schema.methods.length < 50 ||
  schema.types.length < 100
) {
  throw new Error(
    'public/schema/bot-api.json looks like a placeholder. Run npm run schema:update with a working docs connection.',
  );
}

if (schema.methodCount !== schema.methods.length || schema.typeCount !== schema.types.length) {
  throw new Error(
    'public/schema/bot-api.json methodCount/typeCount do not match the actual arrays.',
  );
}

const methodNames = new Set();
for (const method of schema.methods) {
  if (!method.name || !Array.isArray(method.parameters)) {
    throw new Error(`Invalid method entry: ${JSON.stringify(method)}`);
  }

  if (methodNames.has(method.name)) {
    throw new Error(`Duplicate method entry: ${method.name}`);
  }
  methodNames.add(method.name);

  for (const parameter of method.parameters) {
    if (!parameter.name || typeof parameter.required !== 'boolean') {
      throw new Error(`Invalid parameter in ${method.name}: ${JSON.stringify(parameter)}`);
    }
  }
}

const typeNames = new Set();
for (const type of schema.types) {
  if (!type.name || !Array.isArray(type.fields)) {
    throw new Error(`Invalid type entry: ${JSON.stringify(type)}`);
  }

  if (typeNames.has(type.name)) {
    throw new Error(`Duplicate type entry: ${type.name}`);
  }
  typeNames.add(type.name);
}

if (checkDocsSchema) {
  const copyJson = await readFile(docsSchemaPath, 'utf8').catch(() => '');
  if (!copyJson) {
    throw new Error('docs/schema/bot-api.json is missing. Run npm run build.');
  }

  if (copyJson !== schemaJson) {
    throw new Error(
      'docs/schema/bot-api.json is out of sync with public/schema/bot-api.json. Run npm run build.',
    );
  }
}

console.log(`Validated ${schema.methods.length} methods and ${schema.types.length} types.`);
