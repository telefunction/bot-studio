<script setup lang="ts">
import { Check } from '@lucide/vue';

// Native checkboxes only pick up the app's brand color via `accent-color`, which themes the
// checked fill but leaves the *unchecked* box and border drawn by the OS/browser's own (light)
// widget chrome - even with `color-scheme: dark` set, that native chrome doesn't match this app's
// specific navy/paper palette, so every checkbox visibly clashed with its surroundings in dark
// mode. This fully custom-draws both states instead, so it looks identical - and on-theme - in
// every browser regardless of native form-control rendering.
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'sm' });
const model = defineModel<boolean>({ required: true });
</script>

<template>
  <span
    class="relative inline-flex shrink-0 items-center justify-center rounded transition hover:scale-105"
    :class="size === 'md' ? 'h-5 w-5' : 'h-4 w-4'"
  >
    <input
      v-model="model"
      type="checkbox"
      class="peer border-ink-950/20 checked:border-signal-blue checked:bg-signal-blue focus-visible:outline-signal-blue/50 dark:border-paper-50/20 dark:checked:border-signal-blueDark dark:checked:bg-signal-blueDark dark:focus-visible:outline-signal-blueDark/50 absolute inset-0 h-full w-full cursor-pointer appearance-none rounded border-2 bg-transparent transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    />
    <Check
      class="text-paper-50 pointer-events-none relative h-full w-full scale-90 stroke-[3] opacity-0 transition-opacity peer-checked:opacity-100"
    />
  </span>
</template>
