<script setup lang="ts">
import { useId } from 'vue';

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
</script>

<template>
  <div class="field-shell" :class="as === 'input' ? wrapperSizeClass : 'overflow-hidden'">
    <textarea
      v-if="as === 'textarea'"
      :id="fieldId"
      v-model="model"
      :placeholder="placeholder ?? label"
      :aria-label="label"
      :disabled="disabled"
      class="disabled:text-ink-950 dark:disabled:text-paper-50 block w-full min-w-0 flex-1 resize-y rounded-lg bg-transparent p-3 outline-none disabled:opacity-100"
      :class="[controlTextClass, minHeight, { 'pe-12': $slots.suffix }]"
    />
    <input
      v-else
      :id="fieldId"
      v-model="model"
      :type="type"
      :placeholder="placeholder ?? label"
      :aria-label="label"
      :disabled="disabled"
      class="disabled:text-ink-950 dark:disabled:text-paper-50 h-full min-w-0 flex-1 rounded-lg bg-transparent px-3 outline-none disabled:opacity-100"
      :class="controlTextClass"
    />
    <!-- Textarea suffix content (the builder-wand button) floats over the top-right corner
    instead of taking a flex column, so the native resize handle in the bottom-right corner —
    which a full-height flex sibling would otherwise crowd or sit on top of — stays clear.
    Positioned against this bordered box (the nearest `relative` ancestor), so it lands right in
    its top-right corner. -->
    <span
      v-if="$slots.suffix && as === 'textarea'"
      class="absolute inset-e-1.5 top-1.5 flex items-center gap-1"
    >
      <slot name="suffix" />
    </span>
    <span
      v-else-if="$slots.suffix"
      class="surface-divider flex shrink-0 divide-x self-stretch overflow-hidden rounded-r-lg"
    >
      <slot name="suffix" />
    </span>
  </div>
</template>
