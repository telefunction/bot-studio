<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Check, Wand2 } from '@lucide/vue';
import type { TelegramParameter, TelegramSchema } from '@/types/schema';
import {
  defaultForNode,
  parseTypeNode,
  seedForNode,
  serializeNode,
  type TypeNode,
} from '@/lib/typeSchema';
import { displayName } from '@/lib/telegram';
import AppModal from '@/components/AppModal.vue';
import TypeFieldEditor from '@/components/TypeFieldEditor.vue';
import FieldMeta from '@/components/FieldMeta.vue';

const props = defineProps<{ parameter: TelegramParameter; schema: TelegramSchema }>();

const text = defineModel<string>({ required: true });
const open = defineModel<boolean>('open', { required: true });

const rootNode = computed<TypeNode>(() => parseTypeNode(props.parameter.type, props.schema));
const formState = ref<unknown>(null);

function primeForm() {
  let parsed: unknown;
  try {
    const trimmed = text.value.trim();
    parsed = trimmed ? JSON.parse(trimmed) : undefined;
  } catch {
    parsed = undefined;
  }
  formState.value =
    parsed !== undefined
      ? seedForNode(rootNode.value, props.schema, parsed)
      : defaultForNode(rootNode.value, props.schema);
}

// immediate: true because ParameterInput.vue now only mounts this component once the
// builder is first requested — at which point `open` is already true on arrival, so a
// plain (non-immediate) watch would never fire for that first open.
watch(
  open,
  (isOpen) => {
    if (!isOpen) return;
    primeForm();
  },
  { immediate: true },
);

function save() {
  const result = serializeNode(rootNode.value, props.schema, formState.value) ?? {};
  text.value = JSON.stringify(result, null, 2);
  open.value = false;
}

function cancel() {
  open.value = false;
}
</script>

<template>
  <AppModal v-model:open="open" :title="displayName(parameter.name)" eyebrow="Visual builder">
    <template #icon><Wand2 class="h-5 w-5" /></template>
    <template #title
      ><FieldMeta :name="displayName(parameter.name)" :type="parameter.type" size="lg"
    /></template>
    <TypeFieldEditor
      v-if="formState !== null"
      v-model="formState"
      :node="rootNode"
      :schema="schema"
      :depth="0"
      :visited="[]"
    />
    <p v-else class="py-12 text-center text-sm">Preparing the builder…</p>
    <template #footer>
      <p class="text-ink-700 dark:text-paper-300 hidden text-xs sm:block">
        <span class="text-signal-red">*</span> Required fields
      </p>
      <div class="ml-auto flex items-center gap-2">
        <button type="button" class="modal-secondary" @click="cancel">Cancel</button>
        <button type="button" class="modal-primary" @click="save">
          <Check class="h-4 w-4" /> Save to field
        </button>
      </div>
    </template>
  </AppModal>
</template>
