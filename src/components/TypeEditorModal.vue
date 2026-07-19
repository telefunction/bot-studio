<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue';
import { Check, Wand2, X } from 'lucide-vue-next';
import type { TelegramParameter, TelegramSchema } from '@/types/schema';
import {
  defaultForNode,
  parseTypeNode,
  seedForNode,
  serializeNode,
  type TypeNode,
} from '@/lib/typeSchema';
import { displayName } from '@/lib/telegram';
import { useFocusTrap } from '@/composables/useFocusTrap';
import TypeFieldEditor from '@/components/TypeFieldEditor.vue';

const props = defineProps<{ parameter: TelegramParameter; schema: TelegramSchema }>();

const text = defineModel<string>({ required: true });
const open = defineModel<boolean>('open', { required: true });

const rootNode = computed<TypeNode>(() => parseTypeNode(props.parameter.type, props.schema));
const formState = ref<unknown>(null);
const dialogRef = useTemplateRef<HTMLElement>('dialogRef');
const titleId = useId();

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

watch(open, (isOpen) => {
  if (!isOpen) return;
  primeForm();
  nextTick(() => dialogRef.value?.focus());
});

function save() {
  const result = serializeNode(rootNode.value, props.schema, formState.value) ?? {};
  text.value = JSON.stringify(result, null, 2);
  open.value = false;
}

function cancel() {
  open.value = false;
}

const { onKeydown } = useFocusTrap(dialogRef, cancel);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-pop">
      <div v-if="open" class="fixed inset-0 z-50 overflow-y-auto p-4" role="presentation">
        <div
          class="fixed inset-0 bg-ink-950/50 backdrop-blur-sm dark:bg-black/70"
          @click="cancel"
        />
        <div class="relative flex min-h-full items-center justify-center">
          <div
            ref="dialogRef"
            class="panel relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            tabindex="-1"
            @keydown="onKeydown"
          >
            <!-- A thin gradient strip marking this as the app's headline "visual JSON builder" feature,
          not just another panel — cheap visual identity that still only uses existing signal.* tokens. -->
            <div
              class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-signal-blue via-signal-cyan to-signal-blueBright"
            />

            <div
              class="relative shrink-0 overflow-hidden border-b border-ink-950/[0.08] px-5 py-4 dark:border-paper-50/[0.08]"
            >
              <div
                class="pointer-events-none absolute inset-0 bg-gradient-to-r from-signal-blue/10 via-transparent to-transparent dark:from-signal-blueDark/15"
              />
              <div class="relative flex items-center justify-between gap-3">
                <div class="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    class="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-signal-blue/30 bg-signal-blue/10 text-signal-blue dark:border-signal-blueDark/30 dark:bg-signal-blueDark/15 dark:text-signal-blueBright"
                  >
                    <Wand2 class="h-5 w-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <h3 :id="titleId" class="truncate text-lg font-black">
                      {{ displayName(parameter.name) }} builder
                    </h3>
                    <p
                      class="mt-1 inline-flex max-w-full truncate rounded-md bg-paper-200 px-2 py-0.5 font-mono text-[0.7rem] font-bold text-ink-700 dark:bg-navy-700 dark:text-paper-300"
                    >
                      {{ parameter.type }}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="icon-button shrink-0"
                  title="Close"
                  aria-label="Close"
                  @click="cancel"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <TypeFieldEditor
                v-if="formState !== null"
                v-model="formState"
                :node="rootNode"
                :schema="schema"
                :depth="0"
                :visited="[]"
              />
              <!-- Covers the brief instant between the modal opening and primeForm() populating formState
            (formState starts as null) with an intentional placeholder instead of a blank flash. -->
              <div
                v-else
                class="flex h-40 flex-col items-center justify-center gap-2 text-center text-ink-700/60 dark:text-paper-300/60"
              >
                <Wand2 class="h-6 w-6 animate-pulse" />
                <p class="text-xs font-semibold">Preparing the builder…</p>
              </div>
            </div>

            <div
              class="flex shrink-0 items-center justify-between gap-3 border-t border-ink-950/[0.08] bg-paper-100/60 px-5 py-4 dark:border-paper-50/[0.08] dark:bg-navy-900/40"
            >
              <p class="hidden text-[0.7rem] text-ink-700/70 dark:text-paper-300/70 sm:block">
                <span class="text-signal-red">*</span> Required fields
              </p>
              <div class="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-ink-950/[0.08] px-4 py-2 text-sm font-bold text-ink-700 transition hover:bg-paper-100 dark:border-paper-50/[0.08] dark:text-paper-300 dark:hover:bg-navy-800"
                  @click="cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-signal-blue bg-signal-blue px-4 py-2 text-sm font-black text-paper-50 transition hover:-translate-y-0.5 hover:bg-signal-blueHover dark:border-signal-blueDark dark:bg-signal-blueDark dark:hover:bg-signal-blueHover"
                  @click="save"
                >
                  <Check class="h-4 w-4" /> Save to field
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-pop-enter-active,
.modal-pop-leave-active {
  transition: opacity 0.18s ease;
}

.modal-pop-enter-active .panel,
.modal-pop-leave-active .panel {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
}

.modal-pop-enter-from .panel,
.modal-pop-leave-to .panel {
  opacity: 0;
  transform: scale(0.97) translateY(4px);
}
</style>
