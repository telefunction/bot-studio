<script setup lang="ts">
import { Eye, EyeOff, KeyRound, Lock } from '@lucide/vue';
import { computed, ref } from 'vue';

defineProps<{ methodName?: string }>();
const token = defineModel<string>({ required: true });
const visible = ref(false);
const hasToken = computed(() => token.value.trim().length > 0);
</script>

<template>
  <section class="token-card mt-5" aria-labelledby="token-label">
    <div class="flex items-start gap-3">
      <span class="token-symbol" aria-hidden="true"><KeyRound class="h-5 w-5" /></span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <label id="token-label" for="tokenInput" class="font-bold">Bot token</label>
          <span v-if="hasToken" class="token-status token-status--filled"
            ><span class="h-1.5 w-1.5 rounded-full bg-current" />Token added</span
          >
        </div>
        <p class="text-ink-700 dark:text-paper-300 mt-1 text-xs leading-5">
          Your key to the Telegram Bot API
        </p>
      </div>
    </div>
    <div class="field-shell mt-4 overflow-hidden">
      <input
        id="tokenInput"
        v-model="token"
        class="h-12 min-w-0 flex-1 bg-transparent px-4 font-mono text-sm outline-none"
        :type="visible ? 'text' : 'password'"
        placeholder="123456789:AA…"
        autocomplete="off"
        autocapitalize="off"
        :spellcheck="false"
        aria-describedby="token-privacy"
      />
      <button
        class="control-suffix-button my-1 me-1 h-auto rounded-lg"
        type="button"
        :title="visible ? 'Hide token' : 'Show token'"
        :aria-label="visible ? 'Hide token' : 'Show token'"
        :aria-pressed="visible"
        @click="visible = !visible"
      >
        <EyeOff v-if="visible" class="h-4 w-4" /><Eye v-else class="h-4 w-4" />
      </button>
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p
        id="token-privacy"
        class="text-ink-700 dark:text-paper-300 flex items-start gap-1.5 text-xs leading-5"
      >
        <Lock class="mt-1 h-3 w-3 shrink-0" />Kept in this tab. Sent only to Telegram.
      </p>
      <span
        v-if="methodName"
        class="token-endpoint max-w-full truncate font-mono text-xs"
        :title="`/bot…/${methodName}`"
        >/bot<span class="opacity-50">…</span>/{{ methodName }}</span
      >
    </div>
  </section>
</template>
