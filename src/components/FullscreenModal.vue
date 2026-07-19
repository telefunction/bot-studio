<script setup lang="ts">
import { nextTick, useId, useTemplateRef, watch } from 'vue';
import { X } from 'lucide-vue-next';

defineProps<{ title: string }>();
const open = defineModel<boolean>('open', { required: true });

const dialogRef = useTemplateRef<HTMLElement>('dialogRef');
const titleId = useId();

watch(open, (isOpen) => {
  if (!isOpen) return;
  nextTick(() => dialogRef.value?.focus());
});

function close() {
  open.value = false;
}

function focusableEls(): HTMLElement[] {
  const root = dialogRef.value;
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== 'Tab') return;
  const els = focusableEls();
  if (els.length === 0) return;
  const first = els[0];
  const last = els[els.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 grid place-items-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        class="absolute inset-0 bg-ink-950/50 backdrop-blur-sm dark:bg-black/70"
        @click="close"
      />
      <div
        ref="dialogRef"
        class="panel relative flex h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl sm:h-[calc(100vh-3rem)]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <div
          class="flex items-center justify-between gap-3 border-b border-ink-950/[0.08] px-5 py-4 dark:border-paper-50/[0.08]"
        >
          <h3 :id="titleId" class="truncate text-lg font-black">{{ title }}</h3>
          <div class="flex items-center gap-2">
            <slot name="actions" />
            <button
              type="button"
              class="icon-button"
              title="Close"
              aria-label="Close"
              @click="close"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
