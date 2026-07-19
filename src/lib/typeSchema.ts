import type { TelegramParameter, TelegramSchema, TelegramType } from '@/types/schema';
import { primitiveTypeNames } from '@/lib/telegram';

/**
 * A parsed, resolved view of a Telegram type string (e.g. the raw
 * "InlineKeyboardMarkup or ReplyKeyboardMarkup or ReplyKeyboardRemove or ForceReply"
 * or "Array of Array of InlineKeyboardButton" strings found in the schema),
 * used to decide which widget the visual builder should render for a field.
 */
export type TypeNode =
  | { kind: 'primitive'; name: string }
  | { kind: 'custom'; type: TelegramType }
  | { kind: 'array'; of: TypeNode }
  | { kind: 'union'; branches: TypeNode[] }
  | { kind: 'unknown'; raw: string };

/**
 * Caps recursive descent into nested custom types so a malformed/cyclic schema can never hang the tab.
 * The primary cycle guard is the `visited` type-name chain (catches direct and mutual cycles immediately);
 * this depth cap is just a backstop against pathologically long *acyclic* chains. The deepest real chain in
 * the current schema (measured across all 388 types) is 7 custom-type levels, so this leaves comfortable
 * headroom without letting a genuine cycle run away.
 */
export const MAX_NODE_DEPTH = 14;

function splitUnion(raw: string): string[] {
  if (/\s+or\s+/i.test(raw)) {
    return raw
      .split(/\s+or\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  // Handles the "A , B , C and D" list style used for e.g. sendMediaGroup's
  // "Array of InputMediaAudio , InputMediaDocument , ... and InputMediaVideo".
  if (raw.includes(',') && /\band\b/i.test(raw)) {
    const parts = raw
      .split(/\s*,\s*|\s+and\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 1) return parts;
  }

  return [raw];
}

export function parseTypeNode(raw: string, schema: TelegramSchema, depth = 0): TypeNode {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: 'unknown', raw: trimmed };
  if (depth > MAX_NODE_DEPTH) return { kind: 'unknown', raw: trimmed };

  const arrayMatch = /^Array of\s+(.+)$/i.exec(trimmed);
  if (arrayMatch) {
    return { kind: 'array', of: parseTypeNode(arrayMatch[1], schema, depth + 1) };
  }

  const branches = splitUnion(trimmed);
  if (branches.length > 1) {
    return {
      kind: 'union',
      branches: branches.map((branch) => parseTypeNode(branch, schema, depth + 1)),
    };
  }

  if (primitiveTypeNames.has(trimmed)) {
    return { kind: 'primitive', name: trimmed };
  }

  const found = schema.types.find((type) => type.name === trimmed);
  if (found) {
    // Telegram's docs give ~34 "base" types an empty field table: 7 are genuine field-less
    // placeholders ("Currently holds no information") and the other 27 (e.g. ReactionType,
    // ChatMember, InputMedia) are abstract "it can be one of ..." unions whose real shape only
    // exists as a handful of concrete sibling types (ReactionTypeEmoji, ChatMemberOwner, ...).
    // Surface those 27 as a proper `union` node (so the tabbed builder in TypeFieldEditor.vue
    // renders them) instead of falling through to the raw-JSON dead end.
    if (found.fields.length === 0 && !isPlaceholderLeafType(found)) {
      const subtypes = deriveUnionSubtypes(found, schema);
      if (subtypes.length > 0) {
        return {
          kind: 'union',
          branches: subtypes.map((subtype) => parseTypeNode(subtype.name, schema, depth + 1)),
        };
      }
    }
    return { kind: 'custom', type: found };
  }

  return { kind: 'unknown', raw: trimmed };
}

/**
 * The 7 empty-field types that are genuinely field-less per Telegram's own docs (as opposed to
 * being an abstract union base type with an empty field table, like ReactionType). Detected primarily
 * by the "Currently holds no information" / "currently holds no information" phrasing Telegram uses
 * verbatim for all 7 today; the explicit name list is kept as a backstop in case that phrasing ever
 * drifts, so a wording change can never silently reclassify a real placeholder as a union (or vice versa).
 */
const KNOWN_PLACEHOLDER_LEAF_NAMES = new Set([
  'CommunityChatRemoved',
  'ForumTopicClosed',
  'ForumTopicReopened',
  'GeneralForumTopicHidden',
  'GeneralForumTopicUnhidden',
  'VideoChatStarted',
  'CallbackGame',
]);

function isPlaceholderLeafType(type: TelegramType): boolean {
  return (
    KNOWN_PLACEHOLDER_LEAF_NAMES.has(type.name) || /holds no information/i.test(type.description)
  );
}

/**
 * Derives the concrete subtypes of an abstract "it can be one of ..." base type (e.g. ReactionType)
 * purely from data already in the schema, so this never needs a hardcoded per-type subtype list that
 * could rot as the hourly schema-update cron adds/renames Telegram types:
 *
 * 1. Candidates are every other type whose name starts with the base type's name and which has at
 *    least one field (e.g. ReactionTypeEmoji, ReactionTypeCustomEmoji, ReactionTypePaid for ReactionType).
 * 2. Real Telegram tagged unions share a common first-field name across their variants (usually
 *    "type", but e.g. "status" for ChatMember* variants, "source" for ChatBoostSource* and
 *    PassportElementError* variants).
 *    Group candidates by their first field's name and find the dominant group (requires >= 2 members
 *    to count as "dominant" at all, so a single coincidental name-prefix match never becomes a union).
 * 3. Drop any candidate whose first field isn't the dominant name — this correctly excludes e.g.
 *    ChatMemberUpdated (first field "chat", not ChatMember's dominant "status") from ChatMember, and
 *    similarly PaidMediaInfo/PaidMediaPurchased from PaidMedia, OwnedGifts from OwnedGift,
 *    InlineQueryResultsButton from InlineQueryResult, and the RichBlockCaption/TableCell/ListItem
 *    helper types from RichBlock/InputRichBlock.
 *
 * Returns [] when no dominant group is found (e.g. MaybeInaccessibleMessage, InputPollMedia,
 * InputPollOptionMedia, InputMessageContent, InputFile — their real subtypes don't share a name
 * prefix with the base type at all), in which case the caller leaves today's dead-end behavior alone.
 */
function deriveUnionSubtypes(base: TelegramType, schema: TelegramSchema): TelegramType[] {
  const candidates = schema.types.filter(
    (type) => type.name !== base.name && type.name.startsWith(base.name) && type.fields.length > 0,
  );
  if (candidates.length === 0) return [];

  const firstFieldCounts = new Map<string, number>();
  for (const candidate of candidates) {
    const firstFieldName = candidate.fields[0].name;
    firstFieldCounts.set(firstFieldName, (firstFieldCounts.get(firstFieldName) ?? 0) + 1);
  }

  let dominantName = '';
  let dominantCount = 0;
  for (const [name, count] of firstFieldCounts) {
    if (count > dominantCount) {
      dominantName = name;
      dominantCount = count;
    }
  }
  if (dominantCount < 2) return [];

  return candidates.filter((candidate) => candidate.fields[0].name === dominantName);
}

export function fieldNode(field: TelegramParameter, schema: TelegramSchema, depth = 0): TypeNode {
  return parseTypeNode(field.type, schema, depth);
}

function bottomType(node: TypeNode): TypeNode {
  let current = node;
  while (current.kind === 'array') current = current.of;
  return current;
}

/**
 * True when this branch eventually resolves (after unwrapping arrays) to a real schema type: either a
 * concrete custom type, or a union (e.g. the derived ReactionType union) that itself has at least one
 * resolvable branch. Without the union case, an "Array of ReactionType" field would never earn its
 * builder wand icon in ParameterInput.vue, since its bottom type is a union, not a bare custom type.
 */
export function isResolvableBranch(node: TypeNode): boolean {
  const bottom = bottomType(node);
  if (bottom.kind === 'custom') return true;
  if (bottom.kind === 'union') return bottom.branches.some(isResolvableBranch);
  return false;
}

/**
 * True when the builder has something concretely useful to render for this branch: either a
 * known custom type (nested or not), or a plain one-level "Array of <primitive>" (e.g. "Array of
 * String") which already gets a real add/remove list widget in TypeFieldEditor. Kept separate from
 * isResolvableBranch, which also gates union-tab visibility deeper in the tree and should stay
 * restricted to custom types there.
 */
export function isBuildableBranch(node: TypeNode): boolean {
  if (isResolvableBranch(node)) return true;
  return node.kind === 'array' && node.of.kind === 'primitive';
}

export function topLevelBranches(node: TypeNode): TypeNode[] {
  return node.kind === 'union' ? node.branches : [node];
}

/** The set of branches worth offering the user a form for (used to decide whether to show the builder button at all). */
export function resolvableVariants(typeString: string, schema: TelegramSchema): TypeNode[] {
  const root = parseTypeNode(typeString, schema);
  return topLevelBranches(root).filter(isBuildableBranch);
}

export function branchLabel(node: TypeNode): string {
  switch (node.kind) {
    case 'custom':
      return node.type.name;
    case 'primitive':
      return node.name;
    case 'array':
      return `Array of ${branchLabel(node.of)}`;
    case 'union':
      return node.branches.map(branchLabel).join(' or ');
    case 'unknown':
      return node.raw || 'Unknown';
  }
}

/** Union values are represented in form state as {variant, value} so a chosen branch's shape never collides with a sibling branch's. */
export type UnionValue = { variant: number; value: unknown };

function isDeadEndCustom(node: Extract<TypeNode, { kind: 'custom' }>, visited: readonly string[]) {
  return node.type.fields.length === 0 || visited.includes(node.type.name);
}

export function defaultForNode(
  node: TypeNode,
  schema: TelegramSchema,
  depth = 0,
  visited: readonly string[] = [],
): unknown {
  if (depth > MAX_NODE_DEPTH) return '';

  switch (node.kind) {
    case 'primitive':
      if (node.name === 'Boolean') return false;
      if (node.name === 'True') return true;
      return '';
    case 'unknown':
      return '';
    case 'custom': {
      if (isDeadEndCustom(node, visited)) return {};
      const nextVisited = [...visited, node.type.name];
      const obj: Record<string, unknown> = {};
      for (const field of node.type.fields) {
        obj[field.name] = defaultForNode(
          fieldNode(field, schema, depth + 1),
          schema,
          depth + 1,
          nextVisited,
        );
      }
      return obj;
    }
    case 'array':
      return [];
    case 'union':
      return {
        variant: 0,
        value: defaultForNode(node.branches[0], schema, depth, visited),
      } satisfies UnionValue;
  }
}

function matchUnionBranch(branches: TypeNode[], raw: unknown): number {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 0;
  const keys = new Set(Object.keys(raw as Record<string, unknown>));
  let bestIndex = 0;
  let bestScore = -1;
  branches.forEach((branch, index) => {
    const leaf = bottomType(branch);
    const fieldNames = leaf.kind === 'custom' ? leaf.type.fields.map((field) => field.name) : [];
    const score = fieldNames.filter((name) => keys.has(name)).length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

/** Best-effort prefill of form state from an existing (possibly hand-edited) JSON value; falls back to a blank default on any shape mismatch, never throws. */
export function seedForNode(
  node: TypeNode,
  schema: TelegramSchema,
  raw: unknown,
  depth = 0,
  visited: readonly string[] = [],
): unknown {
  if (depth > MAX_NODE_DEPTH) return defaultForNode(node, schema, depth, visited);

  switch (node.kind) {
    case 'primitive': {
      if (node.name === 'Boolean' || node.name === 'True')
        return typeof raw === 'boolean' ? raw : defaultForNode(node, schema, depth, visited);
      if (typeof raw === 'string') return raw;
      if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
      return '';
    }
    case 'unknown':
      if (raw === undefined) return '';
      try {
        return JSON.stringify(raw);
      } catch {
        return '';
      }
    case 'custom': {
      if (isDeadEndCustom(node, visited)) return raw && typeof raw === 'object' ? raw : {};
      if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return defaultForNode(node, schema, depth, visited);
      const nextVisited = [...visited, node.type.name];
      const source = raw as Record<string, unknown>;
      const obj: Record<string, unknown> = {};
      for (const field of node.type.fields) {
        const childNode = fieldNode(field, schema, depth + 1);
        obj[field.name] =
          field.name in source
            ? seedForNode(childNode, schema, source[field.name], depth + 1, nextVisited)
            : defaultForNode(childNode, schema, depth + 1, nextVisited);
      }
      return obj;
    }
    case 'array': {
      if (!Array.isArray(raw)) return [];
      return raw.map((item) => seedForNode(node.of, schema, item, depth + 1, visited));
    }
    case 'union': {
      const variant = matchUnionBranch(node.branches, raw);
      return {
        variant,
        value: seedForNode(node.branches[variant], schema, raw, depth, visited),
      } satisfies UnionValue;
    }
  }
}

export function isEmptySerialized(value: unknown, required: boolean): boolean {
  if (value === undefined) return true;
  if (value === '') return true;
  if (value === false && !required) return true;
  if (Array.isArray(value) && value.length === 0 && !required) return true;
  // A dead-end/placeholder custom type (e.g. CallbackGame, which has zero fields) serializes to "{}" whether
  // or not the user touched it. Without this, that empty object would survive as a real key in the saved
  // JSON — the exact "Callback Game: {}" leak reported in issue 2. Never applies to required fields: an
  // empty object placed there deliberately (or left as the only possible value) must still come through.
  if (
    !required &&
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0
  ) {
    return true;
  }
  return false;
}

/** Mirrors buildPayload's "omit blank/false optional values" convention (src/lib/telegram.ts) so JSON built here matches the rest of the app. */
export function serializeNode(
  node: TypeNode,
  schema: TelegramSchema,
  value: unknown,
  depth = 0,
  visited: readonly string[] = [],
): unknown {
  if (depth > MAX_NODE_DEPTH) return undefined;

  switch (node.kind) {
    case 'primitive': {
      if (node.name === 'Boolean' || node.name === 'True') return value === true;
      if (node.name === 'Integer') {
        const trimmed = String(value ?? '').trim();
        if (!trimmed) return undefined;
        const parsed = Number.parseInt(trimmed, 10);
        return Number.isNaN(parsed) ? undefined : parsed;
      }
      if (node.name === 'Float') {
        const trimmed = String(value ?? '').trim();
        if (!trimmed) return undefined;
        const parsed = Number.parseFloat(trimmed);
        return Number.isNaN(parsed) ? undefined : parsed;
      }
      const trimmed = String(value ?? '').trim();
      return trimmed === '' ? undefined : trimmed;
    }
    case 'unknown': {
      const trimmed = String(value ?? '').trim();
      if (!trimmed) return undefined;
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    }
    case 'custom': {
      if (isDeadEndCustom(node, visited)) {
        if (value && typeof value === 'object') return value;
        const trimmed = String(value ?? '').trim();
        if (!trimmed) return undefined;
        try {
          return JSON.parse(trimmed);
        } catch {
          return undefined;
        }
      }
      if (!value || typeof value !== 'object') return undefined;
      const nextVisited = [...visited, node.type.name];
      const source = value as Record<string, unknown>;
      const obj: Record<string, unknown> = {};
      for (const field of node.type.fields) {
        const childNode = fieldNode(field, schema, depth + 1);
        const serialized = serializeNode(
          childNode,
          schema,
          source[field.name],
          depth + 1,
          nextVisited,
        );
        if (isEmptySerialized(serialized, field.required)) continue;
        obj[field.name] = serialized;
      }
      return obj;
    }
    case 'array': {
      if (!Array.isArray(value)) return undefined;
      return value
        .map((item) => serializeNode(node.of, schema, item, depth + 1, visited))
        .filter((item) => item !== undefined && item !== '');
    }
    case 'union': {
      if (!value || typeof value !== 'object') return undefined;
      const unionValue = value as UnionValue;
      const branch = node.branches[unionValue.variant];
      if (!branch) return undefined;
      return serializeNode(branch, schema, unionValue.value, depth, visited);
    }
  }
}

export function isLongTextField(field: TelegramParameter) {
  return field.name === 'text' || field.name.includes('caption') || field.description.length > 120;
}

/** A short human-readable label for a collapsed array-item card, e.g. an InlineKeyboardButton's own text. */
export function summarizeCustomValue(node: TypeNode, value: unknown, fallback: string): string {
  if (node.kind !== 'custom' || !value || typeof value !== 'object') return fallback;
  const source = value as Record<string, unknown>;
  for (const field of node.type.fields) {
    if (/^(text|title|name|command|label|question)$/i.test(field.name)) {
      const candidate = source[field.name];
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
  }
  return fallback;
}
