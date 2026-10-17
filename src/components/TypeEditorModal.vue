<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue';
import { Check, Wand2, X } from '@lucide/vue';
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
import FieldMeta from '@/components/FieldMeta.vue';

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

// immediate: true because ParameterInput.vue now only mounts this component once the
// builder is first requested — at which point `open` is already true on arrival, so a
// plain (non-immediate) watch would never fire for that first open.
watch(
  open,
  (isOpen) => {
    if (!isOpen) return;
    primeForm();
    nextTick(() => dialogRef.value?.focus());
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

const { onKeydown } = useFocusTrap(dialogRef, cancel);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-pop">
      <div v-if="open" class="fixed inset-0 z-50 overflow-y-auto p-4" role="presentation">
        <div
          class="bg-ink-950/50 fixed inset-0 backdrop-blur-sm dark:bg-black/70"
          @click="cancel"
        />
        <div class="relative flex min-h-full items-center justify-center">
          <div
            ref="dialogRef"
            class="panel relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            tabindex="-1"
            @keydown="onKeydown"
          >
            <!-- The badge echoes App.vue's own logo mark (same rounded-2xl gradient + breathing glow)
            instead of borrowing a code-editor's chrome — this is the app's headline feature, so it
            gets the app's own brand treatment rather than a "developer tool" costume. The field name
            + type reuses FieldMeta (name plus a hover/tap tooltip for the type), the exact same
            convention every field already uses in the form and inside this builder itself, instead
            of a standalone always-visible mono "field : type" line. -->
            <div
              class="border-ink-950/8 dark:border-paper-50/8 relative shrink-0 overflow-hidden border-b px-6 py-4"
            >
              <div
                class="from-signal-blue/7 to-signal-cyan/6 dark:from-signal-blueDark/12 dark:to-signal-cyan/6 pointer-events-none absolute inset-0 bg-linear-to-br via-transparent"
              />
              <div class="relative flex items-center gap-3">
                <div class="relative shrink-0">
                  <span
                    class="animate-breathe bg-signal-blue/40 dark:bg-signal-blueDark/40 absolute inset-0 -z-10 rounded-2xl blur-md"
                    aria-hidden="true"
                  />
                  <div
                    class="from-signal-blue to-signal-cyan text-paper-50 shadow-glow dark:from-signal-blueDark dark:to-signal-cyan dark:shadow-glowDark relative grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br"
                  >
                    <Wand2 class="h-5 w-5" />
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p
                    class="text-signal-blueHover/80 dark:text-signal-blueBright/80 text-[0.68rem] font-black tracking-wide uppercase"
                  >
                    Visual builder
                  </p>
                  <FieldMeta
                    :id="titleId"
                    :name="displayName(parameter.name)"
                    :type="parameter.type"
                    size="lg"
                  />
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

            <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
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
                class="text-ink-700/60 dark:text-paper-300/60 flex h-40 flex-col items-center justify-center gap-2 text-center"
              >
                <Wand2 class="h-6 w-6 animate-pulse" />
                <p class="text-xs font-semibold">Preparing the builder…</p>
              </div>
            </div>

            <div
              class="border-ink-950/8 bg-paper-100/60 dark:border-paper-50/8 dark:bg-navy-900/40 flex shrink-0 items-center justify-between gap-3 border-t px-6 py-4"
            >
              <p class="text-ink-700/70 dark:text-paper-300/70 hidden text-[0.7rem] sm:block">
                <span class="text-signal-red">*</span> Required fields
              </p>
              <div class="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  class="border-ink-950/8 text-ink-700 hover:bg-paper-100 dark:border-paper-50/8 dark:text-paper-300 dark:hover:bg-navy-800 rounded-lg border px-4 py-2 text-sm font-bold transition"
                  @click="cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="border-signal-blue bg-signal-blue text-paper-50 hover:bg-signal-blueHover dark:border-signal-blueDark dark:bg-signal-blueDark dark:hover:bg-signal-blueHover inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-black transition hover:-translate-y-0.5"
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
