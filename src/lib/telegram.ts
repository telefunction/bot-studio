import type { FileValue, ParamValue, TelegramMethod, TelegramParameter } from '@/types/schema';

export const dangerousMethods = new Set([
  'deleteWebhook',
  'setWebhook',
  'banChatMember',
  'unbanChatMember',
  'restrictChatMember',
  'deleteMessage',
  'deleteMessages',
  'leaveChat',
  'close',
  'logOut',
]);

export type ParameterKind = 'file' | 'boolean' | 'number' | 'json' | 'textarea' | 'text';

export function normalizeToken(token: string) {
  const trimmed = token.trim();
  return trimmed.startsWith('bot') ? trimmed.slice(3) : trimmed;
}

export function maskToken(token: string) {
  const clean = normalizeToken(token);
  if (!clean) return '';
  const [id, secret = ''] = clean.split(':');
  if (!secret) return `${clean.slice(0, 5)}...`;
  return `${id}:${secret.slice(0, 4)}...${secret.slice(-3)}`;
}

export function displayName(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export const primitiveTypeNames = new Set([
  'String',
  'Integer',
  'Float',
  'Boolean',
  'True',
  'InputFile',
]);

export function typeWords(type: string) {
  return [...type.matchAll(/\b[A-Z][A-Za-z0-9]*\b/g)].map(([word]) => word);
}

export function hasType(type: string, name: string) {
  return new RegExp(`\\b${name}\\b`, 'i').test(type);
}

function allowsString(type: string) {
  return hasType(type, 'String');
}

function isPureNumberType(type: string) {
  return /^\s*(Integer|Float)\s*$/i.test(type);
}

function isJsonType(parameter: TelegramParameter) {
  const type = parameter.type;
  const description = parameter.description.toLowerCase();
  const customObjectNames = typeWords(type).filter(
    (word) => !primitiveTypeNames.has(word) && word !== 'Array',
  );

  return (
    hasType(type, 'Array') ||
    hasType(type, 'Object') ||
    customObjectNames.length > 0 ||
    description.includes('json-serialized')
  );
}

export function inferKind(parameter: TelegramParameter): ParameterKind {
  if (hasType(parameter.type, 'InputFile')) return 'file';
  if (
    (hasType(parameter.type, 'Boolean') || hasType(parameter.type, 'True')) &&
    !allowsString(parameter.type)
  )
    return 'boolean';
  if (isPureNumberType(parameter.type)) return 'number';
  if (isJsonType(parameter)) return 'json';
  if (
    parameter.name === 'text' ||
    parameter.name.includes('caption') ||
    parameter.description.length > 120
  )
    return 'textarea';
  return 'text';
}

export function fileAccept(parameter: TelegramParameter) {
  const name = parameter.name.toLowerCase();
  if (name.includes('photo') || name.includes('thumbnail') || name.includes('cover'))
    return 'image/*';
  if (name.includes('video') || name.includes('animation')) return 'video/*';
  if (name.includes('audio') || name.includes('voice')) return 'audio/*';
  if (name.includes('sticker')) return 'image/*,video/*,.tgs';
  if (name.includes('certificate')) return '.pem,.crt,.cer';
  return '';
}

export function defaultValues(method: TelegramMethod | null): Record<string, ParamValue> {
  if (!method) return {};
  return Object.fromEntries(
    method.parameters.map((parameter) => {
      const kind = inferKind(parameter);
      if (kind === 'boolean') return [parameter.name, false];
      if (kind === 'file')
        return [parameter.name, { mode: 'text', text: '', file: null } satisfies FileValue];
      return [parameter.name, ''];
    }),
  );
}

export function fileParamValue(value: ParamValue | undefined) {
  if (!value || typeof value !== 'object') return value;
  return value.mode === 'file' ? value.file || undefined : value.text || undefined;
}

export function parseValue(type: string, value: unknown) {
  if (value instanceof File) return value;
  if (typeof value === 'boolean') return value;
  const trimmed = String(value || '').trim();
  if (!trimmed) return undefined;

  if (hasType(type, 'Integer') && allowsString(type) && /^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  if (/^\s*Integer\s*$/i.test(type)) {
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? trimmed : parsed;
  }

  if (/^\s*Float\s*$/i.test(type)) {
    const parsed = Number.parseFloat(trimmed);
    return Number.isNaN(parsed) ? trimmed : parsed;
  }

  if (
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    hasType(type, 'Array') ||
    hasType(type, 'Object') ||
    typeWords(type).some((word) => !primitiveTypeNames.has(word) && word !== 'Array')
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

export function parseRequestJson(json: string): Record<string, unknown> {
  const trimmed = json.trim();
  if (!trimmed) return {};

  const parsed: unknown = JSON.parse(trimmed);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Request JSON must be an object.');
  }

  return parsed as Record<string, unknown>;
}

export function buildPayload(method: TelegramMethod | null, values: Record<string, ParamValue>) {
  const payload: Record<string, unknown> = {};
  if (!method) return payload;

  method.parameters.forEach((parameter) => {
    const rawValue =
      inferKind(parameter) === 'file'
        ? fileParamValue(values[parameter.name])
        : values[parameter.name];
    const parsed = parseValue(parameter.type, rawValue);
    if (parsed === undefined || parsed === '') return;
    // Mirrors typeSchema.ts's isEmptySerialized: an untouched optional boolean defaults to
    // false, which would otherwise silently appear in every request payload. Omit it unless
    // the parameter is required, in which case an explicit false is meaningful and must survive.
    if (parsed === false && !parameter.required) return;
    payload[parameter.name] = parsed;
  });

  return payload;
}

export function buildRequestInitFromPayload(payload: Record<string, unknown>): RequestInit {
  const hasFile = Object.values(payload).some((value) => value instanceof File);

  if (!hasFile) {
    return {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    };
  }

  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value, value.name);
      return;
    }
    if (value !== undefined && value !== '')
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  });

  return { body: formData };
}

export function buildPreviewPayload(
  method: TelegramMethod | null,
  values: Record<string, ParamValue>,
) {
  return Object.fromEntries(
    Object.entries(buildPayload(method, values)).map(([key, value]) => [
      key,
      value instanceof File
        ? { file: value.name, size: value.size, type: value.type || 'application/octet-stream' }
        : value,
    ]),
  );
}

export function missingRequiredFromPayload(
  method: TelegramMethod | null,
  payload: Record<string, unknown>,
) {
  if (!method) return [];
  return method.parameters.filter((parameter) => {
    const value = payload[parameter.name];
    if (value instanceof File) return false;
    return (
      parameter.required && (value === undefined || value === null || String(value).trim() === '')
    );
  });
}

export function jsonForDisplay(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function levenshteinDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previousDiagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const previousRow = row[j];
      row[j] =
        a[i - 1] === b[j - 1]
          ? previousDiagonal
          : 1 + Math.min(previousDiagonal, row[j], row[j - 1]);
      previousDiagonal = previousRow;
    }
  }
  return row[b.length];
}

/** Ranks methods by closeness to an unresolved URL path segment, for a 404
 * page's "did you mean" suggestions. A substring relationship (typo'd casing,
 * a missing/extra word) beats every edit-distance match, since it's the
 * strongest signal of intent. */
export function suggestMethods(
  methods: TelegramMethod[],
  query: string,
  limit = 4,
): TelegramMethod[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  return [...methods]
    .map((method) => {
      const name = method.name.toLowerCase();
      const distance =
        name.includes(needle) || needle.includes(name) ? 0 : levenshteinDistance(name, needle);
      return { method, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((entry) => entry.method);
}
