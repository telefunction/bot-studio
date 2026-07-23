<script setup lang="ts">
import { ref, useId, useTemplateRef } from 'vue';

// Shared control for every plain scalar input/textarea across the top-level form
// (ParameterInput.vue) and the builder (TypeFieldEditor.vue). It's a real native `placeholder`
// (so it behaves and looks like an ordinary field), with `label` exposed only as the control's
// accessible name (via `aria-label`) since there's no visible label element.
const props = withDefaults(
  defineProps<{
    label: string;
    /** Resting hint shown as the native placeholder; defaults to `label` when omitted. */
    placeholder?: string;
    id?: string;
    as?: 'input' | 'textarea';
    type?: string;
    size?: 'lg' | 'sm';
    required?: boolean;
    disabled?: boolean;
    /** min-h-* class for the textarea variant; callers size this to their own content. */
    minHeight?: string;
  }>(),
  {
    id: undefined,
    placeholder: undefined,
    as: 'input',
    type: 'text',
    size: 'lg',
    minHeight: 'min-h-32',
  },
);

const model = defineModel<string>({ required: true });

const autoId = useId();
const fieldId = props.id ?? autoId;

const wrapperSizeClass = props.size === 'lg' ? 'h-11' : 'h-9';
const controlTextClass = props.size === 'lg' ? '' : 'text-sm';

/**
 * Native `resize` silently does nothing on an element sitting inside a CSS multi-column container
 * (`columns-*`, used by ParameterForm.vue's masonry tile layout) — verified directly: an identical
 * flex+resize:vertical textarea resizes fine in isolation, but the moment its ancestor chain
 * includes a `column-count` context, dragging its native resize corner has zero effect (Chromium
 * disables it there, presumably because letting a fragment resize would break the column-balancing
 * algorithm). Rather than make every field give up masonry to get a working textarea, or vice
 * versa, this drives an explicit height by hand: `resize-none` turns off the (non-functional-here)
 * native handle, and this small corner grip does the same drag-to-resize gesture in plain mouse
 * events instead, which isn't subject to that column-layout restriction.
 */
const textareaRef = useTemplateRef<HTMLTextAreaElement>('textareaRef');
const customHeightPx = ref<number | null>(null);

function startResize(event: MouseEvent) {
  event.preventDefault();
  const startY = event.clientY;
  const startHeight = textareaRef.value?.offsetHeight ?? 0;
  function onMove(moveEvent: MouseEvent) {
    customHeightPx.value = Math.max(80, startHeight + (moveEvent.clientY - startY));
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}
</script>

<template>
  <div
    class="relative flex min-w-0 items-stretch rounded-lg border border-ink-950/[0.08] bg-paper-100 transition focus-within:border-signal-blue focus-within:ring-4 focus-within:ring-signal-blue/15 dark:border-paper-50/[0.08] dark:bg-navy-900 dark:focus-within:border-signal-blueDark dark:focus-within:ring-signal-blueDark/25"
    :class="as === 'input' ? wrapperSizeClass : ['p-3', $slots.suffix ? 'pe-9' : '']"
  >
    <!-- Padding lives on this wrapper (not the textarea itself) for the textarea variant, and the
    textarea is left square-cornered — so the box insets it symmetrically on all four sides. Giving
    the textarea its own px-3 + rounded-lg (as the input variant has) instead left it flush against
    the wrapper's right border with no horizontal clearance, so the resize grip in its bottom-right
    corner sat jammed right against the wrapper's *rounded* corner curve instead of sitting
    comfortably inset like the top/left padding already gave it. -->
    <textarea
      v-if="as === 'textarea'"
      :id="fieldId"
      ref="textareaRef"
      v-model="model"
      :placeholder="placeholder ?? label"
      :aria-label="label"
      :disabled="disabled"
      class="min-w-0 flex-1 resize-none bg-transparent outline-none disabled:text-ink-950 disabled:opacity-100 dark:disabled:text-paper-50"
      :class="[controlTextClass, customHeightPx === null ? minHeight : '']"
      :style="customHeightPx !== null ? { height: `${customHeightPx}px` } : undefined"
    />
    <input
      v-else
      :id="fieldId"
      v-model="model"
      :type="type"
      :placeholder="placeholder ?? label"
      :aria-label="label"
      :disabled="disabled"
      class="h-full min-w-0 flex-1 rounded-lg bg-transparent px-3 outline-none disabled:text-ink-950 disabled:opacity-100 dark:disabled:text-paper-50"
      :class="controlTextClass"
    />
    <!-- Textarea suffix content (the builder-wand button) floats over the top-right corner
    instead of taking a flex column, so the native resize handle in the bottom-right corner —
    which a full-height flex sibling would otherwise crowd or sit on top of — stays clear.
    Positioned against this bordered box (the nearest `relative` ancestor), so it lands right in
    its top-right corner. -->
    <span
      v-if="$slots.suffix && as === 'textarea'"
      class="absolute end-1.5 top-1.5 flex items-center gap-1"
    >
      <slot name="suffix" />
    </span>
    <span
      v-else-if="$slots.suffix"
      class="flex shrink-0 divide-x divide-ink-950/[0.08] self-stretch overflow-hidden rounded-r-lg dark:divide-paper-50/[0.08]"
    >
      <slot name="suffix" />
    </span>
    <!-- Custom drag-to-resize grip replacing the native (non-functional here, see the comment on
    customHeightPx above) resize handle — same corner, same cursor, same visual language as the
    native grip it stands in for. The hit area (h-5 w-5) is deliberately bigger than the visible
    glyph (h-2.5 w-2.5) — a small drag target in a box corner is fiddly to grab precisely otherwise. -->
    <div
      v-if="as === 'textarea'"
      class="absolute bottom-0 end-0 flex h-5 w-5 cursor-ns-resize items-end justify-end p-1 text-ink-950/25 transition-colors hover:text-ink-950/50 dark:text-paper-50/25 dark:hover:text-paper-50/50"
      title="Drag to resize"
      @mousedown="startResize"
    >
      <svg
        viewBox="0 0 10 10"
        class="h-2.5 w-2.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
      >
        <path d="M1 9L9 1M4 9L9 4M7 9L9 7" stroke-linecap="round" />
      </svg>
    </div>
  </div>
</template>
