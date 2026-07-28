<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, useTemplateRef, watch } from 'vue';
import { Upload, Wand2, X } from 'lucide-vue-next';
import type { FileValue, ParamValue, TelegramParameter, TelegramSchema } from '@/types/schema';
import { displayName, fileAccept, inferKind } from '@/lib/telegram';
import { resolvableVariants } from '@/lib/typeSchema';
import AppCheckbox from '@/components/AppCheckbox.vue';
import ExpandableText from '@/components/ExpandableText.vue';
import FieldControl from '@/components/FieldControl.vue';
import FieldMeta from '@/components/FieldMeta.vue';

// TypeEditorModal (and the recursive TypeFieldEditor tree it pulls in) is the
// single largest chunk of component code in the app, but only a minority of
// parameters ever need the visual builder and it's only rendered once
// `builderOpen` is true. Loading it as a separate chunk keeps that weight out
// of the initial bundle for every session that never opens the builder.
const TypeEditorModal = defineAsyncComponent(() => import('@/components/TypeEditorModal.vue'));

const props = defineProps<{ parameter: TelegramParameter; schema: TelegramSchema | null }>();
const model = defineModel<ParamValue>({ required: true });
const kind = computed(() => inferKind(props.parameter));

const showBuilder = computed(() => {
  if (kind.value !== 'json' || !props.schema) return false;
  return resolvableVariants(props.parameter.type, props.schema).length > 0;
});
const builderOpen = ref(false);
// v-if="showBuilder && schema" alone would mount TypeEditorModal (and trigger its
// defineAsyncComponent import) the instant a builder-eligible field appears on the page —
// long before the user ever clicks the wand button, defeating the whole point of splitting
// it into a separate chunk. Gating the mount on this too means the chunk fetch only starts
// on the first actual click; it then stays mounted (rather than un-mounting on close) so
// later opens are instant, matching how a lazy component is meant to be used.
const builderRequested = ref(false);
function openBuilder() {
  builderRequested.value = true;
  builderOpen.value = true;
}
const builderTriggerRef = useTemplateRef<HTMLButtonElement>('builderTriggerRef');

watch(builderOpen, (isOpen, wasOpen) => {
  if (!isOpen && wasOpen) nextTick(() => builderTriggerRef.value?.focus());
});
const textValue = computed({
  get() {
    return typeof model.value === 'string' ? model.value : '';
  },
  set(value: string) {
    model.value = value;
  },
});
const booleanValue = computed({
  get() {
    return model.value === true;
  },
  set(value: boolean) {
    model.value = value;
  },
});

const fileState = computed<FileValue>({
  get() {
    const value = model.value;
    if (value && typeof value === 'object') return value;
    return { mode: 'text', text: typeof value === 'string' ? value : '', file: null };
  },
  set(value) {
    model.value = value;
  },
});

function onFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] || null;
  fileState.value = file
    ? { mode: 'file', text: '', file }
    : { ...fileState.value, mode: 'text', file: null };
}
</script>

<template>
  <div
    class="min-w-0 rounded-xl border border-ink-950/[0.08] bg-paper-50 p-4 dark:border-paper-50/[0.08] dark:bg-navy-800"
  >
    <FieldMeta
      :name="displayName(parameter.name)"
      :required="parameter.required"
      :type="parameter.type"
      size="lg"
    />
    <ExpandableText
      tag="blockquote"
      class="mt-3 min-h-5 rounded-md border-l-4 border-signal-blue/40 bg-signal-blue/5 p-1 pl-2 text-xs italic leading-5 text-ink-700 dark:border-signal-blueDark/50 dark:bg-navy-700 dark:text-paper-300"
      :text="parameter.description"
      :lines="2"
    />

    <!-- Size is the top-level/primary step of a deliberate two-step scale (20px here vs. the
    builder's denser 16px nested checkbox in TypeFieldEditor.vue) — a form with one boolean per
    card can afford a bigger target than a builder panel with many fields in limited space. The
    True/False label flip is shared with the nested control on purpose, so the same control reads
    the same way at every depth. -->
    <label
      v-if="kind === 'boolean'"
      class="mt-4 flex items-center gap-3 text-sm font-bold text-ink-700 dark:text-paper-300"
    >
      <AppCheckbox v-model="booleanValue" size="md" />
      {{ booleanValue ? 'True' : 'False' }}
    </label>

    <div v-else-if="kind === 'file'" class="mt-4">
      <FieldControl
        v-model="fileState.text"
        :label="displayName(parameter.name)"
        placeholder="file_id or https://..."
        :disabled="fileState.mode === 'file'"
      >
        <template #suffix>
          <label class="control-suffix-button" title="Choose file">
            <Upload class="h-4 w-4" />
            <input class="sr-only" type="file" :accept="fileAccept(parameter)" @change="onFile" />
          </label>
          <button
            v-if="fileState.mode === 'file'"
            class="control-suffix-button"
            type="button"
            title="Remove file"
            @click="fileState = { mode: 'text', text: '', file: null }"
          >
            <X class="h-4 w-4" />
          </button>
        </template>
      </FieldControl>
      <p class="mt-2 truncate text-xs text-ink-700 dark:text-paper-300">
        {{
          fileState.mode === 'file'
            ? `Selected: ${fileState.file?.name}`
            : 'Enter a file_id/URL or upload a local file.'
        }}
      </p>
    </div>

    <div v-else-if="kind === 'textarea' || kind === 'json'" class="mt-4">
      <FieldControl
        v-model="textValue"
        as="textarea"
        :label="displayName(parameter.name)"
        :placeholder="parameter.name + ':'"
      >
        <template v-if="showBuilder" #suffix>
          <button
            ref="builderTriggerRef"
            type="button"
            class="icon-button h-7 w-7"
            title="Open visual builder"
            aria-label="Open visual builder"
            @click="openBuilder"
          >
            <Wand2 class="h-3.5 w-3.5" />
          </button>
        </template>
      </FieldControl>
      <TypeEditorModal
        v-if="showBuilder && schema && builderRequested"
        v-model="textValue"
        v-model:open="builderOpen"
        :parameter="parameter"
        :schema="schema"
      />
    </div>

    <FieldControl
      v-else
      v-model="textValue"
      class="mt-4"
      :type="kind === 'number' ? 'number' : 'text'"
      :label="displayName(parameter.name)"
      :placeholder="parameter.name + ':'"
    />
  </div>
</template>
