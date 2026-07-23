<script setup lang="ts">
import { Info } from 'lucide-vue-next';

// Shared field-header line ("Name [*required] [ⓘ]") used by both the top-level ParameterInput.vue
// form and the nested TypeFieldEditor.vue builder, at two scales. The type used to render as its
// own boxed pill (or, briefly, a muted inline suffix) sitting next to the name — either way a
// second piece of always-on text competing with the name for attention. Tucking it behind a small
// info glyph keeps the type a tap/hover away without it reading as its own UI element; the tooltip
// itself reuses the exact hover/focus reveal pattern from App.vue's theme-switcher button, and
// triggers on plain `focus` (not `focus-visible`) so a touch tap opens it too, not just keyboard nav.
withDefaults(
  defineProps<{
    name: string;
    required?: boolean;
    type?: string;
    size?: 'lg' | 'sm';
    as?: 'div' | 'label';
    htmlFor?: string;
  }>(),
  { size: 'lg', as: 'div', type: undefined, htmlFor: undefined },
);
</script>

<template>
  <component
    :is="as"
    :for="as === 'label' ? htmlFor : undefined"
    class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5"
    :class="size === 'lg' ? 'font-black' : 'text-xs font-bold text-ink-700 dark:text-paper-300'"
  >
    <span class="min-w-0 break-words">{{ name }}</span>
    <span v-if="required" class="text-signal-red">*</span>
    <span v-if="type" class="group/type relative inline-flex shrink-0">
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-full text-ink-700/50 transition hover:text-signal-blueHover focus:text-signal-blueHover focus:outline-none dark:text-paper-300/50 dark:hover:text-signal-blueBright dark:focus:text-signal-blueBright"
        :class="size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'"
        :aria-label="`Type: ${type}`"
      >
        <Info :class="size === 'lg' ? 'h-3.5 w-3.5' : 'h-3 w-3'" />
      </button>
      <span
        role="tooltip"
        class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md border border-ink-950/[0.08] bg-paper-50 px-2 py-1 font-mono text-[0.68rem] font-bold text-ink-950 opacity-0 shadow-soft transition duration-150 group-focus-within/type:translate-y-0 group-focus-within/type:opacity-100 group-hover/type:translate-y-0 group-hover/type:opacity-100 dark:border-paper-50/[0.08] dark:bg-navy-800 dark:text-paper-50 dark:shadow-darkSoft"
      >
        {{ type }}
      </span>
    </span>
  </component>
</template>
