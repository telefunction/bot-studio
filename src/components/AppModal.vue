<script setup lang="ts">
import { nextTick, onBeforeUnmount, useId, useTemplateRef, watch } from 'vue';
import { X } from '@lucide/vue';
import { useFocusTrap } from '@/composables/useFocusTrap';

withDefaults(
  defineProps<{ title: string; eyebrow?: string; size?: 'compact' | 'editor' | 'fullscreen' }>(),
  { eyebrow: undefined, size: 'editor' },
);
const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ close: [] }>();
const titleId = useId();
const dialogRef = useTemplateRef<HTMLElement>('dialogRef');
let returnFocus: HTMLElement | null = null;
function close() {
  open.value = false;
  emit('close');
}
function restoreFocus() {
  returnFocus?.focus();
  returnFocus = null;
}
watch(
  open,
  async (isOpen) => {
    if (!isOpen) {
      restoreFocus();
      return;
    }
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    if (open.value) dialogRef.value?.focus();
  },
  { immediate: true },
);
onBeforeUnmount(restoreFocus);
const { onKeydown } = useFocusTrap(dialogRef, close);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-pop">
      <div v-if="open" class="modal-stage" role="presentation">
        <div class="modal-backdrop" @click="close" />
        <section
          ref="dialogRef"
          class="panel modal-dialog"
          :class="`modal-dialog--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <header class="modal-header">
            <span v-if="$slots.icon" class="modal-symbol" aria-hidden="true"
              ><slot name="icon"
            /></span>
            <div class="min-w-0 flex-1">
              <p v-if="eyebrow" class="section-kicker mb-1">{{ eyebrow }}</p>
              <div :id="titleId">
                <slot name="title"
                  ><h2 class="text-lg font-bold tracking-tight">{{ title }}</h2></slot
                >
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <slot name="actions" />
              <button
                type="button"
                class="modal-close"
                aria-label="Close"
                title="Close"
                @click="close"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
          </header>
          <div
            class="modal-content"
            :class="{ 'modal-content--fullscreen': size === 'fullscreen' }"
          >
            <slot />
          </div>
          <footer v-if="$slots.footer" class="modal-footer"><slot name="footer" /></footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
