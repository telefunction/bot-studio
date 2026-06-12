<script setup lang="ts">
import { computed } from "vue";
import { Upload, X } from "lucide-vue-next";
import type { FileValue, ParamValue, TelegramParameter } from "@/types/schema";
import { displayName, fileAccept, inferKind } from "@/lib/telegram";

const props = defineProps<{ parameter: TelegramParameter }>();
const model = defineModel<ParamValue>({ required: true });
const kind = computed(() => inferKind(props.parameter));
const textValue = computed({
  get() {
    return typeof model.value === "string" ? model.value : "";
  },
  set(value: string) {
    model.value = value;
  }
});
const booleanValue = computed({
  get() {
    return model.value === true;
  },
  set(value: boolean) {
    model.value = value;
  }
});

const fileState = computed<FileValue>({
  get() {
    const value = model.value;
    if (value && typeof value === "object") return value;
    return { mode: "text", text: typeof value === "string" ? value : "", file: null };
  },
  set(value) {
    model.value = value;
  }
});

function onFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] || null;
  fileState.value = file ? { mode: "file", text: "", file } : { ...fileState.value, mode: "text", file: null };
}
</script>

<template>
  <label class="min-w-0 rounded-xl border border-ink-950/10 bg-paper-50 p-4 dark:border-paper-50/10 dark:bg-ink-900">
    <span class="block min-w-0">
      <span class="break-words font-black">{{ displayName(parameter.name) }}</span>
      <span v-if="parameter.required" class="text-signal-red"> *</span>
    </span>
    <span class="text-xs">Type: </span>
    <span class="mt-2 inline-flex max-w-full truncate rounded-md bg-paper-200 px-2 py-1 font-mono text-[0.7rem] font-bold text-ink-700 dark:bg-ink-800 dark:text-paper-300">
      {{ parameter.type }}
    </span>
    <blockquote
      class="mt-3 min-h-5 rounded-md border-l-4 border-ink-950/20 pl-2 p-1 text-xs italic leading-5 text-ink-700 dark:border-paper-50/20 dark:text-paper-300 bg-paper-100 dark:bg-ink-850">
      {{ parameter.description }}
    </blockquote>

    <label v-if="kind === 'boolean'" class="mt-4 flex items-center gap-3 text-sm font-bold text-ink-700 dark:text-paper-300">
      <input v-model="booleanValue" type="checkbox"
        class="h-5 w-5 cursor-pointer rounded border-2 border-ink-950/20 accent-signal-blue transition hover:scale-105 dark:border-paper-50/20" />
      True
    </label>

    <div v-else-if="kind === 'file'" class="mt-4">
      <div class="flex min-w-0 overflow-hidden rounded-lg border border-ink-950/10 bg-paper-100 focus-within:border-signal-blue focus-within:ring-4 focus-within:ring-signal-blue/15 dark:border-paper-50/10 dark:bg-ink-850">
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
        <button v-if="fileState.mode === 'file'" class="icon-button m-1" type="button" title="Remove file" @click="fileState = { mode: 'text', text: '', file: null }">
          <X class="h-4 w-4" />
        </button>
      </div>
      <p class="mt-2 truncate text-xs text-ink-700 dark:text-paper-300">
        {{ fileState.mode === "file" ? `Selected: ${fileState.file?.name}` : "Enter a file_id/URL or upload a local file." }}
      </p>
    </div>

    <textarea
      v-else-if="kind === 'textarea' || kind === 'json'"
      v-model="textValue"
      class="control mt-4 min-h-32 resize-y py-3"
      :placeholder="kind === 'json' ? '{ }' : parameter.name + ':'"
    />

    <input
      v-else
      v-model="textValue"
      class="control mt-4 h-11"
      :type="kind === 'number' ? 'number' : 'text'"
      :placeholder="parameter.name + ':'"
    />
  </label>
</template>
