<script setup lang="ts">
import { CheckCircle2, Clipboard, Loader2, ServerCrash } from "lucide-vue-next";
import { computed } from "vue";
import type { ResponseState } from "@/types/schema";
import { jsonForDisplay } from "@/lib/telegram";

const props = defineProps<{
  requestError: string;
  response: ResponseState;
}>();

const requestJson = defineModel<string>("requestJson", { required: true });

defineEmits<{
  copyRequest: [];
  copyResponse: [];
}>();

const responseText = computed(() => (props.response.payload ? jsonForDisplay(props.response.payload) : props.response.error));
const statusClass = computed(() => {
  if (props.response.status === "ok") return "bg-signal-lime/15 text-ink-950 dark:text-signal-lime";
  if (props.response.status === "loading") return "bg-signal-blue/15 text-signal-blue";
  if (props.response.status === "failed" || String(props.response.status).startsWith("HTTP")) return "bg-signal-red/10 text-signal-red";
  return "bg-paper-200 text-ink-700 dark:bg-ink-800 dark:text-paper-300";
});
</script>

<template>
  <aside class="grid min-w-0 content-start gap-4 xl:block xl:space-y-4">
    <section class="panel min-w-0 rounded-xl p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-lg font-black">Request</h3>
        <button class="icon-button" type="button" title="Copy request JSON" @click="$emit('copyRequest')">
          <Clipboard class="h-4 w-4" />
        </button>
      </div>
      <textarea
        v-model="requestJson"
        class="code-pane min-h-48 w-full resize-y text-white"
        spellcheck="false"
        aria-label="Request JSON"
      />
      <p v-if="requestError" class="mt-2 rounded-md border border-signal-red/30 bg-signal-red/10 p-2 text-xs font-bold text-signal-red">
        {{ requestError }}
      </p>
    </section>

    <section class="panel min-w-0 rounded-xl p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-lg font-black">Response</h3>
        <div class="flex items-center gap-2">
          <span class="inline-flex h-8 items-center gap-1 rounded-md px-2 font-mono text-xs font-black uppercase"
            :class="statusClass">
            <Loader2 v-if="response.status === 'loading'" class="h-3.5 w-3.5 animate-spin" />
            <CheckCircle2 v-else-if="response.status === 'ok'" class="h-3.5 w-3.5" />
            <ServerCrash v-else-if="response.status === 'failed' || String(response.status).startsWith('HTTP')"
              class="h-3.5 w-3.5" />
            {{ response.status }}
          </span>
          <button class="icon-button" type="button" title="Copy response JSON" :disabled="!response.payload"
            @click="$emit('copyResponse')">
            <Clipboard class="h-4 w-4" />
          </button>
        </div>
      </div>
      <pre v-if="responseText" class="code-pane">{{ responseText }}</pre>
      <div v-else class="empty-pane">Telegram response will appear here as syntax-highlighted JSON.</div>
    </section>
  </aside>
</template>
