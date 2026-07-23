<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import { ChevronDown, FileJson, MoveDown, MoveUp, Plus, Trash2, Upload } from 'lucide-vue-next';
import type { TelegramParameter, TelegramSchema } from '@/types/schema';
import {
  MAX_NODE_DEPTH,
  branchLabel,
  defaultForNode,
  fieldNode,
  isEmptySerialized,
  isRenderableBranch,
  isLongTextField,
  serializeNode,
  summarizeCustomValue,
  type TypeNode,
  type UnionValue,
} from '@/lib/typeSchema';
import { displayName } from '@/lib/telegram';
import AppCheckbox from '@/components/AppCheckbox.vue';
import ExpandableText from '@/components/ExpandableText.vue';
import FieldControl from '@/components/FieldControl.vue';
import FieldMeta from '@/components/FieldMeta.vue';

const props = defineProps<{
  node: TypeNode;
  schema: TelegramSchema;
  depth: number;
  visited: readonly string[];
  field?: TelegramParameter;
}>();

const model = defineModel<unknown>({ required: true });

const addButtonClass =
  'inline-flex items-center gap-1.5 self-start rounded-lg border border-dashed border-ink-950/20 px-3 py-1.5 text-xs font-bold text-ink-700 transition hover:border-signal-blueHover hover:text-signal-blueHover dark:border-paper-50/20 dark:text-paper-300 dark:hover:border-signal-blueBright dark:hover:text-signal-blueBright';

const fieldDescriptionClass =
  'mb-2 mt-1 block rounded border-l-2 border-signal-blue/40 bg-signal-blue/5 py-1 pl-2 text-[0.68rem] italic leading-4 text-ink-700/80 dark:border-signal-blueDark/50 dark:bg-navy-700/60 dark:text-paper-300/80';

// Every "new box" nested inside a TypeFieldEditor (a collapsible field disclosure, array/row item
// card) shares this one shade + border treatment, so the builder reads as a single family of boxes
// instead of every level improvising its own tone. A custom type's own field list is deliberately
// never boxed itself — that would just draw a second, purposeless border around whatever box its
// caller (an item disclosure, a field disclosure, or the modal's own panel) already drew.
const boxClass =
  'rounded-lg border border-ink-950/[0.08] bg-paper-50 dark:border-paper-50/[0.08] dark:bg-navy-800';

// The clickable header row of every disclosure (a custom field folded behind a toggle, a 2D-array
// item, a plain-array item) — one shared class so all three read as the same kind of control
// instead of three near-identical hand-tuned rows. Each usage additionally gets its own
// rounded-t-lg so this row's hover fill respects the parent box's rounded top corners without the
// box needing overflow-hidden (which would otherwise clip FieldMeta's tooltip popup too).
const disclosureHeaderClass =
  'flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 py-2.5 text-left transition hover:bg-paper-100 dark:hover:bg-navy-700';

// Namespaces this instance's disclosure content ids (aria-controls) so multiple TypeFieldEditor
// instances mounted at once — every recursive level is mounted simultaneously, just visually
// collapsed — never collide on id even when two sibling objects both have a field named the same.
const uid = useId();

/**
 * Name-based heuristic mirroring fileAccept()'s in src/lib/telegram.ts, used to decide whether a
 * nested String field (e.g. an InputMediaPhoto's `media` field) is semantically file-like and
 * should get a lightweight upload affordance. Deliberately narrower than a plain substring check —
 * "media_group_id" contains "media" but isn't a file — so "media" only matches as a whole field
 * name, while the rest match as substrings the same way fileAccept does.
 */
const FILE_LIKE_SUBSTRINGS = [
  'photo',
  'video',
  'audio',
  'voice',
  'document',
  'sticker',
  'animation',
  'thumbnail',
  'cover',
];
function isFileLikeField(field?: TelegramParameter): boolean {
  if (!field) return false;
  const name = field.name.toLowerCase();
  if (name === 'media') return true;
  return FILE_LIKE_SUBSTRINGS.some((needle) => name.includes(needle));
}

const isDeadEnd = computed(() => {
  const node = props.node;
  if (props.depth > MAX_NODE_DEPTH) return true;
  if (node.kind === 'unknown') return true;
  if (node.kind === 'custom')
    return node.type.fields.length === 0 || props.visited.includes(node.type.name);
  if (node.kind === 'union') return !node.branches.some(isRenderableBranch);
  return false;
});

function stringifyDraft() {
  try {
    return JSON.stringify(model.value ?? (props.node.kind === 'array' ? [] : {}), null, 2);
  } catch {
    return '';
  }
}

const draft = ref(stringifyDraft());
const draftError = ref(false);
// Tracks the last value *this* editor wrote, by reference, so the watcher below can tell "the array this
// item lives in got reordered under me" (a different reference — must resync) apart from "I just committed
// this edit myself" (the same reference echoed back through defineModel — must not stomp the user's typing).
let lastCommitted: unknown = model.value;

watch(
  () => model.value,
  (value) => {
    if (value === lastCommitted) return;
    lastCommitted = value;
    draft.value = stringifyDraft();
    draftError.value = false;
  },
);

function onDraftInput() {
  const trimmed = draft.value.trim();
  if (!trimmed) {
    const next = props.node.kind === 'array' ? [] : {};
    lastCommitted = next;
    model.value = next;
    draftError.value = false;
    return;
  }
  try {
    const parsed = JSON.parse(trimmed);
    lastCommitted = parsed;
    model.value = parsed;
    draftError.value = false;
  } catch {
    draftError.value = true;
  }
}

const boolModel = computed<boolean>({
  get: () => model.value === true,
  set: (value) => {
    model.value = value;
  },
});

const scalarModel = computed<string>({
  get: () => {
    const value = model.value;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
  },
  set: (value) => {
    model.value = value;
  },
});

// The resting placeholder for the builder's scalar controls, mirroring ParameterInput.vue's
// `parameter.name + ':'` convention at the top level exactly, so the two forms feel like one
// system. When this instance is a named object field (props.field set), reuse that raw
// snake_case name. When it isn't — a positional array item, a union branch's root, or the modal's
// own root value — there's no field name to draw from, so fall back to the branch's type label
// (e.g. "String") via the same branchLabel() already used elsewhere for that purpose.
const scalarPlaceholder = computed(() =>
  props.field ? `${props.field.name}:` : branchLabel(props.node),
);

// FieldControl's accessible name (aria-label) — the same source as scalarPlaceholder, just run
// through displayName() for the Title Case a screen reader announcement reads better in (the
// visible placeholder deliberately stays in the raw snake_case form instead).
const scalarLabel = computed(() =>
  props.field ? displayName(props.field.name) : branchLabel(props.node),
);

const longText = computed(() => {
  const node = props.node;
  return node.kind === 'primitive' && node.name === 'String' && props.field
    ? isLongTextField(props.field)
    : false;
});

// Whether this scalar's own field looks file-like (see isFileLikeField above). Only ever true for a
// plain String field, never for the long-text branch (a caption/text field is never also a file).
const fileLikeField = computed(() => {
  const node = props.node;
  return (
    node.kind === 'primitive' &&
    node.name === 'String' &&
    !longText.value &&
    isFileLikeField(props.field)
  );
});

/**
 * The builder's form state is a plain JS value tree that gets JSON.stringify'd wholesale on Save
 * (see TypeEditorModal's save()) — there's no FormData/multipart path here like the top-level
 * parameter form has, so a real uploaded File can never actually travel through this field. Rather
 * than force an awkward FileValue-shaped object into a slot that's typed String end to end, this
 * just fills the field with the picked file's name as plain text — a real (if partial) convenience
 * for the common case of eyeballing/copy-pasting a filename, without pretending to support upload.
 */
function onFileLikeChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) scalarModel.value = file.name;
  input.value = '';
}

const items = computed<unknown[]>(() => (Array.isArray(model.value) ? model.value : []));

function nextVisitedFor(typeName: string) {
  return [...props.visited, typeName];
}

function setField(key: string, value: unknown) {
  const current =
    model.value && typeof model.value === 'object' ? (model.value as Record<string, unknown>) : {};
  model.value = { ...current, [key]: value };
}

// Kept out of the template (as opposed to inlining the cast at each call site) because Prettier's
// Vue template parser mis-tokenizes a `Record<string, unknown>` cast inside a mustache as an
// unclosed HTML tag - see the removed .prettierignore entry for this file.
function fieldValue(key: string): unknown {
  return (model.value as Record<string, unknown> | null | undefined)?.[key];
}

type CustomFieldEntry = {
  field: TelegramParameter;
  childNode: TypeNode;
  collapsible: boolean;
  visited: string[];
};

/**
 * Precomputes each subfield's resolved node kind once per render (rather than re-parsing it separately for
 * the disclosure check and for the recursive editor prop). Every field — scalar or nested — renders behind
 * the same closed-by-default disclosure (see the `custom` branch of the template) so the form reads as one
 * consistent list instead of scalars and nested objects looking/behaving differently; the one exception is
 * `collapsible` below.
 */
const customFieldEntries = computed<CustomFieldEntry[]>(() => {
  if (props.node.kind !== 'custom') return [];
  const parentTypeName = props.node.type.name;
  const visited = nextVisitedFor(parentTypeName);
  // A field only gets collapsed behind a disclosure when doing so actually declutters something: a type
  // whose *only* field is itself heavy (e.g. InlineKeyboardMarkup, whose one field is inline_keyboard) has
  // nothing to hide it among, so collapsing it would just add a click before the user can start building.
  const collapsible = props.node.type.fields.length > 1;
  return props.node.type.fields.map((field) => {
    const childNode = fieldNode(field, props.schema, props.depth + 1);
    return { field, childNode, collapsible, visited };
  });
});

/**
 * Short "does this collapsed section actually have anything in it" hint. Reuses serializeNode +
 * isEmptySerialized — the exact rules Save uses to decide what gets omitted — so this hint can never
 * disagree with what actually ends up in the JSON (directly supporting issue 2: seeing at a glance what's
 * really set, without needing to open every section to check).
 */
function subFieldHint(childNode: TypeNode, value: unknown, visited: readonly string[]): string {
  if (childNode.kind === 'array') {
    const count = Array.isArray(value) ? value.length : 0;
    if (count === 0) return 'Empty';
    const unit = childNode.of.kind === 'array' ? 'row' : 'item';
    return `${count} ${unit}${count === 1 ? '' : 's'}`;
  }
  if (childNode.kind === 'union') {
    const unionValue =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'variant' in (value as Record<string, unknown>)
        ? (value as UnionValue)
        : { variant: 0, value: undefined };
    const branch = childNode.branches[unionValue.variant] ?? childNode.branches[0];
    if (!branch) return 'Not set';
    const filled = !isEmptySerialized(
      serializeNode(branch, props.schema, unionValue.value, props.depth + 1, visited),
      false,
    );
    return filled ? branchLabel(branch) : `${branchLabel(branch)} · not set`;
  }
  if (childNode.kind === 'primitive') {
    if (childNode.name === 'Boolean' || childNode.name === 'True') {
      return value === true ? 'True' : 'False';
    }
    if (typeof value === 'string') return value.trim() ? value : 'Not set';
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return 'Not set';
  }
  // custom: prefer a recognizable label (e.g. a nested button's own "text") the same way collapsed array
  // items do; fall back to a plain set/not-set based on whether it would actually serialize to anything.
  const label = summarizeCustomValue(childNode, value, '');
  if (label) return label;
  const filled = !isEmptySerialized(
    serializeNode(childNode, props.schema, value, props.depth + 1, visited),
    false,
  );
  return filled ? 'Set' : 'Not set';
}

// branchLabel() joins every branch of a union with " or " — exactly what an "Add {type}" button
// needs when the array holds a single concrete type, but unusable once that type is itself a big
// union (e.g. InputRichBlock's ~20 variants), where it would spell the entire "X or Y or Z or ..."
// chain into one button. Button labels only ever need a short, generic noun in that case.
function addLabel(node: TypeNode): string {
  return node.kind === 'union' ? 'item' : branchLabel(node);
}

function setArrayItems(next: unknown[]) {
  model.value = next;
}

function addArrayItem() {
  if (props.node.kind !== 'array') return;
  setArrayItems([
    ...items.value,
    defaultForNode(props.node.of, props.schema, props.depth + 1, props.visited),
  ]);
}

function setArrayItem(index: number, value: unknown) {
  const next = items.value.slice();
  next[index] = value;
  setArrayItems(next);
}

function removeArrayItem(index: number) {
  const next = items.value.slice();
  next.splice(index, 1);
  setArrayItems(next);
}

const rows2D = computed<unknown[][]>(() =>
  Array.isArray(model.value) ? (model.value as unknown[][]) : [],
);

function innerNode2D(): TypeNode | null {
  return props.node.kind === 'array' && props.node.of.kind === 'array' ? props.node.of.of : null;
}

function setRows(next: unknown[][]) {
  model.value = next;
}

function addRow() {
  const inner = innerNode2D();
  if (!inner) return;
  setRows([...rows2D.value, [defaultForNode(inner, props.schema, props.depth + 2, props.visited)]]);
}

function removeRow(rowIndex: number) {
  const rows = rows2D.value.slice();
  rows.splice(rowIndex, 1);
  setRows(rows);
}

function moveRow(rowIndex: number, delta: number) {
  const target = rowIndex + delta;
  if (target < 0 || target >= rows2D.value.length) return;
  const rows = rows2D.value.slice();
  [rows[rowIndex], rows[target]] = [rows[target], rows[rowIndex]];
  setRows(rows);
}

function addItem2D(rowIndex: number) {
  const inner = innerNode2D();
  if (!inner) return;
  const rows = rows2D.value.map((row) => row.slice());
  rows[rowIndex].push(defaultForNode(inner, props.schema, props.depth + 2, props.visited));
  setRows(rows);
}

function removeItem2D(rowIndex: number, itemIndex: number) {
  const rows = rows2D.value.map((row) => row.slice());
  rows[rowIndex].splice(itemIndex, 1);
  setRows(rows);
}

function setItem2D(rowIndex: number, itemIndex: number, value: unknown) {
  const rows = rows2D.value.map((row) => row.slice());
  rows[rowIndex][itemIndex] = value;
  setRows(rows);
}

const expandedKeys = ref(new Set<string>());
function isExpanded(key: string) {
  return expandedKeys.value.has(key);
}
function toggleExpanded(key: string) {
  const next = new Set(expandedKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expandedKeys.value = next;
}

const unionState = computed<UnionValue>(() => {
  const value = model.value;
  if (value && typeof value === 'object' && 'variant' in (value as Record<string, unknown>)) {
    return value as UnionValue;
  }
  return { variant: 0, value: undefined };
});

const renderableBranchIndices = computed(() => {
  if (props.node.kind !== 'union') return [] as number[];
  return props.node.branches.reduce<number[]>((acc, branch, index) => {
    if (isRenderableBranch(branch)) acc.push(index);
    return acc;
  }, []);
});

const effectiveVariant = computed(() => {
  const indices = renderableBranchIndices.value;
  if (indices.includes(unionState.value.variant)) return unionState.value.variant;
  return indices[0] ?? 0;
});

const activeBranch = computed<TypeNode | null>(() => {
  if (props.node.kind !== 'union') return null;
  return props.node.branches[effectiveVariant.value] ?? null;
});

function selectVariant(index: number) {
  if (props.node.kind !== 'union') return;
  const branch = props.node.branches[index];
  if (!branch) return;
  model.value = {
    variant: index,
    value: defaultForNode(branch, props.schema, props.depth, props.visited),
  } satisfies UnionValue;
}

function setUnionValue(value: unknown) {
  model.value = { variant: effectiveVariant.value, value } satisfies UnionValue;
}
</script>

<template>
  <div v-if="isDeadEnd" class="min-w-0">
    <div
      class="mb-1 flex items-center gap-1.5 text-[0.7rem] font-bold text-ink-700 dark:text-paper-300"
    >
      <FileJson class="h-3.5 w-3.5 shrink-0" />
      <span>Raw JSON{{ node.kind === 'custom' ? ` — ${node.type.name}` : '' }}</span>
    </div>
    <textarea
      v-model="draft"
      class="control min-h-20 resize-y py-2 font-mono text-xs"
      placeholder="{ }"
      spellcheck="false"
      @input="onDraftInput"
    />
    <p v-if="draftError" class="mt-1 text-[0.7rem] font-semibold text-signal-red">
      Invalid JSON — keeping the last valid value.
    </p>
  </div>

  <!-- Denser step of the same two-step checkbox scale as ParameterInput.vue's top-level boolean
  (16px here vs. 20px there) — same rounded/border/accent treatment and the same True/False label
  flip, just sized for a builder panel that can stack many fields. -->
  <label
    v-else-if="node.kind === 'primitive' && (node.name === 'Boolean' || node.name === 'True')"
    class="flex items-center gap-2 text-sm font-bold text-ink-700 dark:text-paper-300"
  >
    <AppCheckbox v-model="boolModel" />
    <span>{{ boolModel ? 'True' : 'False' }}</span>
  </label>

  <!-- size="sm" is the builder's dense scalar size — deliberately one step down from the
  top-level form's size="lg" primary inputs (ParameterInput.vue), shared consistently by every
  single-line control in this file (this input, the file-like input below, and the array-of-primitive
  item inputs further down) so a String field looks the same everywhere inside the builder. -->
  <FieldControl
    v-else-if="node.kind === 'primitive' && (node.name === 'Integer' || node.name === 'Float')"
    v-model="scalarModel"
    type="number"
    size="sm"
    :label="scalarLabel"
    :placeholder="scalarPlaceholder"
  />

  <FieldControl
    v-else-if="node.kind === 'primitive' && longText"
    v-model="scalarModel"
    as="textarea"
    size="sm"
    min-height="min-h-24"
    :label="scalarLabel"
    :placeholder="scalarPlaceholder"
  />

  <FieldControl
    v-else-if="node.kind === 'primitive' && fileLikeField"
    v-model="scalarModel"
    size="sm"
    :label="scalarLabel"
    placeholder="file_id / URL / filename"
  >
    <template #suffix>
      <label class="control-suffix-button" title="Fill from a local file's name">
        <Upload class="h-3.5 w-3.5" />
        <input class="sr-only" type="file" @change="onFileLikeChange" />
      </label>
    </template>
  </FieldControl>

  <FieldControl
    v-else-if="node.kind === 'primitive'"
    v-model="scalarModel"
    size="sm"
    :label="scalarLabel"
    :placeholder="scalarPlaceholder"
  />

  <div v-else-if="node.kind === 'custom'" class="min-w-0 space-y-3.5">
    <div v-for="entry in customFieldEntries" :key="entry.field.name" class="min-w-0">
      <div v-if="entry.collapsible" :class="boxClass">
        <!-- flex-wrap (not a plain single-line flex row): the hint+chevron chunk on the right is
        shrink-0 and won't give up width, so on a narrow container a long field name used to get
        squeezed into whatever sliver was left over and wrap across many cramped lines. Letting the
        row wrap drops the hint+chevron to their own line below instead, so the label gets the full
        row width to wrap into at most a couple of lines. -->
        <button
          type="button"
          :class="[disclosureHeaderClass, 'rounded-t-lg']"
          :aria-expanded="isExpanded(entry.field.name)"
          :aria-controls="`${uid}-f-${entry.field.name}`"
          @click="toggleExpanded(entry.field.name)"
        >
          <FieldMeta
            size="sm"
            :name="displayName(entry.field.name)"
            :required="entry.field.required"
            :type="entry.childNode.kind !== 'union' ? entry.field.type : undefined"
          />
          <span class="flex shrink-0 items-center gap-1.5 text-ink-700/60 dark:text-paper-300/60">
            <span class="max-w-[10rem] truncate text-[0.68rem] font-semibold">
              {{ subFieldHint(entry.childNode, fieldValue(entry.field.name), entry.visited) }}
            </span>
            <ChevronDown
              class="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
              :class="{ 'rotate-180': isExpanded(entry.field.name) }"
            />
          </span>
        </button>
        <div
          :id="`${uid}-f-${entry.field.name}`"
          class="grid transition-[grid-template-rows] duration-200 ease-out"
          :style="{ gridTemplateRows: isExpanded(entry.field.name) ? '1fr' : '0fr' }"
        >
          <div class="overflow-hidden">
            <div class="border-t border-ink-950/[0.08] p-3.5 dark:border-paper-50/[0.08]">
              <ExpandableText
                v-if="entry.field.description"
                tag="p"
                :text="entry.field.description"
                :lines="2"
                :class="fieldDescriptionClass"
              />
              <TypeFieldEditor
                class="mt-1.5"
                :node="entry.childNode"
                :schema="schema"
                :depth="depth + 1"
                :visited="entry.visited"
                :field="entry.field"
                :model-value="fieldValue(entry.field.name)"
                @update:model-value="(value) => setField(entry.field.name, value)"
              />
            </div>
          </div>
        </div>
      </div>
      <template v-else>
        <FieldMeta
          size="sm"
          :name="displayName(entry.field.name)"
          :required="entry.field.required"
          :type="entry.field.type"
        />
        <ExpandableText
          v-if="entry.field.description"
          tag="p"
          :text="entry.field.description"
          :lines="2"
          :class="fieldDescriptionClass"
        />
        <TypeFieldEditor
          class="mt-1.5"
          :node="entry.childNode"
          :schema="schema"
          :depth="depth + 1"
          :visited="entry.visited"
          :field="entry.field"
          :model-value="fieldValue(entry.field.name)"
          @update:model-value="(value) => setField(entry.field.name, value)"
        />
      </template>
    </div>
  </div>

  <div v-else-if="node.kind === 'array' && node.of.kind === 'array'" class="min-w-0 space-y-3.5">
    <div
      v-for="(row, rowIndex) in rows2D"
      :key="rowIndex"
      class="rounded-lg border border-ink-950/[0.08] bg-paper-100 p-3 dark:border-paper-50/[0.08] dark:bg-navy-900"
      :aria-label="`Row ${rowIndex + 1}`"
    >
      <div class="mb-2.5 flex items-center justify-between gap-2">
        <span
          class="text-[0.68rem] font-black uppercase tracking-wide text-ink-700 dark:text-paper-300"
          >Row {{ rowIndex + 1 }}</span
        >
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="icon-button h-7 w-7"
            :disabled="rowIndex === 0"
            title="Move row up"
            @click="moveRow(rowIndex, -1)"
          >
            <MoveUp class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="icon-button h-7 w-7"
            :disabled="rowIndex === rows2D.length - 1"
            title="Move row down"
            @click="moveRow(rowIndex, 1)"
          >
            <MoveDown class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="icon-button h-7 w-7 hover:border-signal-red hover:text-signal-red"
            title="Remove row"
            @click="removeRow(rowIndex)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div class="space-y-2.5">
        <div v-for="(item, itemIndex) in row" :key="itemIndex" :class="boxClass">
          <button
            type="button"
            :class="[disclosureHeaderClass, 'rounded-t-lg text-xs font-bold']"
            :aria-expanded="isExpanded(`${rowIndex}:${itemIndex}`)"
            :aria-controls="`${uid}-r-${rowIndex}-${itemIndex}`"
            @click="toggleExpanded(`${rowIndex}:${itemIndex}`)"
          >
            <span class="min-w-0 truncate">{{
              node.of.of.kind === 'custom'
                ? summarizeCustomValue(node.of.of, item, `Item ${itemIndex + 1}`)
                : `Item ${itemIndex + 1}`
            }}</span>
            <span class="flex shrink-0 items-center gap-1">
              <span
                class="icon-button h-6 w-6"
                title="Remove"
                @click.stop="removeItem2D(rowIndex, itemIndex)"
              >
                <Trash2 class="h-3 w-3" />
              </span>
              <ChevronDown
                class="h-3.5 w-3.5 transition-transform duration-200"
                :class="{ 'rotate-180': isExpanded(`${rowIndex}:${itemIndex}`) }"
              />
            </span>
          </button>
          <div
            :id="`${uid}-r-${rowIndex}-${itemIndex}`"
            class="grid transition-[grid-template-rows] duration-200 ease-out"
            :style="{ gridTemplateRows: isExpanded(`${rowIndex}:${itemIndex}`) ? '1fr' : '0fr' }"
          >
            <div class="overflow-hidden">
              <div class="border-t border-ink-950/[0.08] p-3.5 dark:border-paper-50/[0.08]">
                <TypeFieldEditor
                  :node="node.of.of"
                  :schema="schema"
                  :depth="depth + 2"
                  :visited="visited"
                  :model-value="item"
                  @update:model-value="(value) => setItem2D(rowIndex, itemIndex, value)"
                />
              </div>
            </div>
          </div>
        </div>
        <button type="button" :class="addButtonClass" @click="addItem2D(rowIndex)">
          <Plus class="h-3.5 w-3.5" /> Add {{ addLabel(node.of.of) }}
        </button>
      </div>
    </div>
    <button type="button" :class="addButtonClass" @click="addRow">
      <Plus class="h-3.5 w-3.5" /> Add row
    </button>
  </div>

  <div
    v-else-if="
      node.kind === 'array' &&
      node.of.kind === 'primitive' &&
      (node.of.name === 'Boolean' || node.of.name === 'True')
    "
    class="min-w-0 space-y-2"
  >
    <label
      v-for="(item, index) in items"
      :key="index"
      class="flex items-center gap-2 text-sm font-bold text-ink-700 dark:text-paper-300"
    >
      <AppCheckbox
        :model-value="item === true"
        @update:model-value="(checked) => setArrayItem(index, checked)"
      />
      <button
        type="button"
        class="icon-button h-7 w-7 hover:border-signal-red hover:text-signal-red"
        @click="removeArrayItem(index)"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </button>
    </label>
    <button type="button" :class="addButtonClass" @click="addArrayItem">
      <Plus class="h-3.5 w-3.5" /> Add item
    </button>
  </div>

  <div
    v-else-if="node.kind === 'array' && node.of.kind === 'primitive'"
    class="min-w-0 space-y-2.5"
  >
    <div v-for="(item, index) in items" :key="index" class="flex items-start gap-2">
      <FieldControl
        :model-value="typeof item === 'string' || typeof item === 'number' ? String(item) : ''"
        :type="node.of.name === 'Integer' || node.of.name === 'Float' ? 'number' : 'text'"
        size="sm"
        class="min-w-0 flex-1"
        :label="`${branchLabel(node.of)} ${index + 1}`"
        @update:model-value="(value) => setArrayItem(index, value)"
      />
      <button
        type="button"
        class="icon-button mt-1 h-7 w-7 shrink-0 hover:border-signal-red hover:text-signal-red"
        title="Remove"
        @click="removeArrayItem(index)"
      >
        <Trash2 class="h-3.5 w-3.5" />
      </button>
    </div>
    <button type="button" :class="addButtonClass" @click="addArrayItem">
      <Plus class="h-3.5 w-3.5" /> Add {{ addLabel(node.of) }}
    </button>
  </div>

  <div v-else-if="node.kind === 'array'" class="min-w-0 space-y-2.5">
    <div v-for="(item, index) in items" :key="index" :class="boxClass">
      <button
        type="button"
        :class="[disclosureHeaderClass, 'rounded-t-lg text-xs font-bold']"
        :aria-expanded="isExpanded(`i:${index}`)"
        :aria-controls="`${uid}-i-${index}`"
        @click="toggleExpanded(`i:${index}`)"
      >
        <span class="min-w-0 truncate">{{
          node.of.kind === 'custom'
            ? summarizeCustomValue(node.of, item, `Item ${index + 1}`)
            : `Item ${index + 1}`
        }}</span>
        <span class="flex shrink-0 items-center gap-1">
          <span class="icon-button h-6 w-6" title="Remove" @click.stop="removeArrayItem(index)">
            <Trash2 class="h-3 w-3" />
          </span>
          <ChevronDown
            class="h-3.5 w-3.5 transition-transform duration-200"
            :class="{ 'rotate-180': isExpanded(`i:${index}`) }"
          />
        </span>
      </button>
      <div
        :id="`${uid}-i-${index}`"
        class="grid transition-[grid-template-rows] duration-200 ease-out"
        :style="{ gridTemplateRows: isExpanded(`i:${index}`) ? '1fr' : '0fr' }"
      >
        <div class="overflow-hidden">
          <div class="border-t border-ink-950/[0.08] p-3.5 dark:border-paper-50/[0.08]">
            <TypeFieldEditor
              :node="node.of"
              :schema="schema"
              :depth="depth + 1"
              :visited="visited"
              :model-value="item"
              @update:model-value="(value) => setArrayItem(index, value)"
            />
          </div>
        </div>
      </div>
    </div>
    <button type="button" :class="addButtonClass" @click="addArrayItem">
      <Plus class="h-3.5 w-3.5" /> Add {{ addLabel(node.of) }}
    </button>
  </div>

  <div v-else-if="node.kind === 'union'" class="min-w-0">
    <!-- overflow-x-auto instead of flex-wrap: on the builder's narrow widths a wrapping pill row
    could eat several lines of vertical space and reflow awkwardly as the modal resizes. A single
    scrollable row keeps this a fixed, predictable height at every width. -->
    <div
      v-if="renderableBranchIndices.length > 1"
      role="group"
      :aria-label="`${field ? displayName(field.name) : 'Value'} type`"
      class="scrollbar-none mb-3 flex gap-1.5 overflow-x-auto rounded-lg bg-paper-200 p-1 dark:bg-navy-900"
    >
      <button
        v-for="index in renderableBranchIndices"
        :key="index"
        type="button"
        :aria-pressed="effectiveVariant === index"
        class="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-bold transition"
        :class="
          effectiveVariant === index
            ? 'bg-paper-50 text-signal-blueHover shadow-soft dark:bg-navy-700 dark:text-signal-blueBright'
            : 'text-ink-700 hover:text-signal-blueHover dark:text-paper-300 dark:hover:text-signal-blueBright'
        "
        @click="selectVariant(index)"
      >
        {{ branchLabel(node.branches[index]) }}
      </button>
    </div>
    <TypeFieldEditor
      v-if="activeBranch"
      :node="activeBranch"
      :schema="schema"
      :depth="depth + 1"
      :visited="visited"
      :model-value="unionState.value"
      @update:model-value="setUnionValue"
    />
  </div>
</template>
