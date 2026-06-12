<script setup lang="ts">
import { Eye, EyeOff, KeyRound } from "lucide-vue-next";
import { ref } from "vue";
import { maskToken } from "@/lib/telegram";

defineProps<{ methodName?: string }>();
const token = defineModel<string>({ required: true });
const visible = ref(false);
</script>

<template>
  <section class="mt-5 rounded-xl border border-ink-950/10 bg-paper-100 p-4 dark:border-paper-50/10 dark:bg-ink-850">
    <div class="flex items-center justify-between gap-3">
      <label class="flex items-center gap-2 font-black" for="tokenInput">
        <KeyRound class="h-4 w-4 text-signal-blue" />
        Bot token
      </label>
      <span class="max-w-[12rem] truncate font-mono text-xs text-ink-700 dark:text-paper-300">{{ maskToken(token) }}</span>
    </div>

    <div
      class="mt-3 flex min-w-0 flex-nowrap overflow-hidden rounded-lg border border-ink-950/10 bg-paper-50 focus-within:border-signal-blue focus-within:ring-4 focus-within:ring-signal-blue/15 dark:border-paper-50/10 dark:bg-ink-950">
      <span
        class="hidden h-11 shrink-0 items-center border-r border-ink-950/10 bg-paper-200 px-3 font-mono text-sm font-black text-ink-700 dark:border-paper-50/10 dark:bg-ink-900 dark:text-paper-300 sm:flex">
        /bot
      </span>

      <input id="tokenInput" v-model="token" class="h-11 min-w-0 flex-1 bg-transparent px-3 outline-none"
        :type="visible ? 'text' : 'password'" placeholder="123456789:AA..." autocomplete="off" />

      <button class="icon-button m-1 shrink-0" type="button" :title="visible ? 'Hide token' : 'Show token'"
        @click="visible = !visible">
        <EyeOff v-if="visible" class="h-4 w-4" />
        <Eye v-else class="h-4 w-4" />
      </button>

      <span
        class="hidden h-11 max-w-[14rem] shrink-0 items-center truncate border-l border-ink-950/10 bg-paper-200 px-3 font-mono text-sm font-black text-ink-700 dark:border-paper-50/10 dark:bg-ink-900 dark:text-paper-300 sm:flex">
        /{{ methodName || "METHOD" }}
      </span>
    </div>

    <p class="mt-2 text-xs leading-5 text-ink-700 dark:text-paper-300">Token is used only in this browser to call Telegram directly and is not stored by this app.</p>
  </section>
</template>
