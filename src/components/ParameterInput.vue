<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, useTemplateRef, watch } from 'vue';
import { Upload, Wand2, X } from 'lucide-vue-next';
import type { FileValue, ParamValue, TelegramParameter, TelegramSchema } from '@/types/schema';
import { displayName, fileAccept, inferKind } from '@/lib/telegram';
import { resolvableVariants } from '@/lib/typeSchema';
import ExpandableText from '@/components/ExpandableText.vue';

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
    <span class="block min-w-0">
      <span class="break-words font-black">{{ displayName(parameter.name) }}</span>
      <span v-if="parameter.required" class="text-signal-red"> *</span>
    </span>
    <span class="text-xs">Type: </span>
    <span
      class="mt-2 inline-flex max-w-full truncate rounded-md bg-paper-200 px-2 py-1 font-mono text-[0.7rem] font-bold text-ink-700 dark:bg-navy-700 dark:text-paper-300"
    >
      {{ parameter.type }}
    </span>
    <ExpandableText
      tag="blockquote"
      class="mt-3 min-h-5 rounded-md border-l-4 border-signal-blue/40 pl-2 p-1 text-xs italic leading-5 text-ink-700 dark:border-signal-blueDark/50 dark:text-paper-300 bg-signal-blue/5 dark:bg-navy-700"
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
      <input
        v-model="booleanValue"
        type="checkbox"
        class="h-5 w-5 cursor-pointer rounded border-2 border-ink-950/20 accent-signal-blue transition hover:scale-105 dark:border-paper-50/20 dark:accent-signal-blueDark"
      />
      {{ booleanValue ? 'True' : 'False' }}
    </label>

    <div v-else-if="kind === 'file'" class="mt-4">
      <div
        class="flex min-w-0 overflow-hidden rounded-lg border border-ink-950/[0.08] bg-paper-100 focus-within:border-signal-blue focus-within:ring-4 focus-within:ring-signal-blue/15 dark:border-paper-50/[0.08] dark:bg-navy-900 dark:focus-within:border-signal-blueDark dark:focus-within:ring-signal-blueDark/25"
      >
        <input
          v-model="fileState.text"
          class="h-11 min-w-0 flex-1 bg-transparent px-3 outline-none disabled:text-ink-950 disabled:opacity-100 dark:disabled:text-paper-50"
          type="text"
          :placeholder="fileState.file ? `${fileState.file.name}` : 'file_id or https://...'"
          :disabled="fileState.mode === 'file'"
        />
        <label class="icon-button m-1" title="Choose file">
          <Upload class="h-4 w-4" />
          <input class="sr-only" type="file" :accept="fileAccept(parameter)" @change="onFile" />
        </label>
        <button
          v-if="fileState.mode === 'file'"
          class="icon-button m-1"
          type="button"
          title="Remove file"
          @click="fileState = { mode: 'text', text: '', file: null }"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
      <p class="mt-2 truncate text-xs text-ink-700 dark:text-paper-300">
        {{
          fileState.mode === 'file'
            ? `Selected: ${fileState.file?.name}`
            : 'Enter a file_id/URL or upload a local file.'
        }}
      </p>
    </div>

    <div v-else-if="kind === 'textarea' || kind === 'json'" class="relative mt-4">
      <textarea
        v-model="textValue"
        class="control min-h-32 resize-y py-3"
        :class="{ 'pr-11': showBuilder }"
        :placeholder="kind === 'json' ? '{ }' : parameter.name + ':'"
      />
      <button
        v-if="showBuilder"
        ref="builderTriggerRef"
        type="button"
        class="icon-button absolute right-2 top-2 h-7 w-7 bg-paper-50/95 backdrop-blur dark:bg-navy-800/95"
        title="Open visual builder"
        aria-label="Open visual builder"
        @click="builderOpen = true"
      >
        <Wand2 class="h-3.5 w-3.5" />
      </button>
      <TypeEditorModal
        v-if="showBuilder && schema"
        v-model="textValue"
        v-model:open="builderOpen"
        :parameter="parameter"
        :schema="schema"
      />
    </div>

    <input
      v-else
      v-model="textValue"
      class="control mt-4 h-11"
      :type="kind === 'number' ? 'number' : 'text'"
      :placeholder="parameter.name + ':'"
    />
  </div>
</template>
