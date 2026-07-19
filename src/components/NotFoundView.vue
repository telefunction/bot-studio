<script setup lang="ts">
import type { TelegramMethod } from '@/types/schema';
import { navigateOnClick } from '@/lib/navigation';

defineProps<{
  path: string;
  suggestions: TelegramMethod[];
}>();

const emit = defineEmits<{ select: [method: TelegramMethod] }>();

function onSuggestionClick(event: MouseEvent, method: TelegramMethod) {
  if (!navigateOnClick(event)) return;
  emit('select', method);
}
</script>

<template>
  <div>
    <div class="border-b border-ink-950/[0.08] pb-5 dark:border-paper-50/[0.08]">
      <h2 class="mt-1 text-3xl font-black leading-none tracking-normal sm:text-5xl">
        Method not found
      </h2>
      <p class="mt-3 max-w-4xl text-sm leading-7 text-ink-700 dark:text-paper-300">
        <code class="rounded bg-paper-100 px-1.5 py-0.5 font-mono text-xs dark:bg-navy-900"
          >/{{ path }}</code
        >
        doesn't match any method in the Telegram Bot API schema — see the Response panel for the
        full error.
      </p>
    </div>

    <div v-if="suggestions.length" class="mt-5">
      <h3 class="text-xs font-black uppercase tracking-wide text-ink-700 dark:text-paper-300">
        Did you mean
      </h3>
      <div class="mt-2 flex flex-wrap gap-2">
        <a
          v-for="method in suggestions"
          :key="method.name"
          :href="method.name"
          class="rounded-lg border border-ink-950/[0.08] bg-paper-50 px-3 py-1.5 text-sm font-bold transition hover:-translate-y-0.5 hover:border-signal-blue hover:bg-paper-100 dark:border-paper-50/[0.08] dark:bg-navy-800 dark:hover:border-signal-blueDark dark:hover:bg-navy-700"
          @click="onSuggestionClick($event, method)"
        >
          {{ method.name }}
        </a>
      </div>
    </div>

    <p class="mt-5 text-sm font-semibold text-ink-700 dark:text-paper-300">
      Or pick any method from the list on the left.
    </p>
  </div>
</template>
