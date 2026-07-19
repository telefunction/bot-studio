<script setup lang="ts">
import { CheckCircle2, Clipboard, Loader2, Maximize2, ServerCrash } from 'lucide-vue-next';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import type { ResponseState } from '@/types/schema';
import { jsonForDisplay } from '@/lib/telegram';
import { highlightJson } from '@/lib/jsonHighlight';
import FullscreenModal from '@/components/FullscreenModal.vue';

const props = defineProps<{
  requestError: string;
  response: ResponseState;
}>();

const requestJson = defineModel<string>('requestJson', { required: true });

defineEmits<{
  copyRequest: [];
  copyResponse: [];
}>();

const responseText = computed(() =>
  props.response.payload ? jsonForDisplay(props.response.payload) : props.response.error,
);
const highlightedRequest = computed(() => highlightJson(requestJson.value));
const highlightedResponse = computed(() => highlightJson(responseText.value));
const statusClass = computed(() => {
  if (props.response.status === 'ok') return 'bg-signal-lime/15 text-ink-950 dark:text-signal-lime';
  if (props.response.status === 'loading')
    return 'bg-signal-blue/15 text-ink-950 dark:bg-signal-blueDark/20 dark:text-paper-50';
  if (props.response.status === 'failed' || String(props.response.status).startsWith('HTTP'))
    return 'bg-signal-red/10 text-signal-red';
  return 'bg-paper-200 text-ink-700 dark:bg-navy-800 dark:text-paper-300';
});

const requestFullscreen = ref(false);
const responseFullscreen = ref(false);
const requestMaximizeBtn = useTemplateRef<HTMLButtonElement>('requestMaximizeBtn');
const responseMaximizeBtn = useTemplateRef<HTMLButtonElement>('responseMaximizeBtn');

// Backdrop <pre> elements behind the editable request textareas. The
// textarea itself renders invisible (transparent) text and stays the
// interactive/scrollable layer; these backdrops render the highlighted HTML
// and are kept in scroll-sync with their textarea via the handlers below.
const requestBackdropEl = useTemplateRef<HTMLElement>('requestBackdropEl');
const requestFullscreenBackdropEl = useTemplateRef<HTMLElement>('requestFullscreenBackdropEl');

function syncRequestScroll(event: Event) {
  const textarea = event.target as HTMLTextAreaElement;
  if (!requestBackdropEl.value) return;
  requestBackdropEl.value.scrollTop = textarea.scrollTop;
  requestBackdropEl.value.scrollLeft = textarea.scrollLeft;
}

function syncRequestFullscreenScroll(event: Event) {
  const textarea = event.target as HTMLTextAreaElement;
  if (!requestFullscreenBackdropEl.value) return;
  requestFullscreenBackdropEl.value.scrollTop = textarea.scrollTop;
  requestFullscreenBackdropEl.value.scrollLeft = textarea.scrollLeft;
}

watch(requestFullscreen, (isOpen, wasOpen) => {
  if (!isOpen && wasOpen) nextTick(() => requestMaximizeBtn.value?.focus());
});
watch(responseFullscreen, (isOpen, wasOpen) => {
  if (!isOpen && wasOpen) nextTick(() => responseMaximizeBtn.value?.focus());
});
</script>

<template>
  <aside class="grid min-w-0 content-start gap-4 xl:block xl:space-y-4">
    <section class="panel min-w-0 rounded-xl p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-lg font-black">Request</h3>
        <div class="flex items-center gap-2">
          <button
            ref="requestMaximizeBtn"
            class="icon-button"
            type="button"
            title="Maximize request"
            aria-label="Maximize request"
            @click="requestFullscreen = true"
          >
            <Maximize2 class="h-4 w-4" />
          </button>
          <button
            class="icon-button"
            type="button"
            title="Copy request JSON"
            @click="$emit('copyRequest')"
          >
            <Clipboard class="h-4 w-4" />
          </button>
        </div>
      </div>
      <div class="code-pane json-editor-shell min-h-48 w-full resize-y">
        <!-- eslint-disable vue/no-v-html -- highlightJson() escapes all source text; only its own generated <span> wrappers are unescaped. -->
        <pre
          ref="requestBackdropEl"
          class="json-editor-box json-editor-backdrop"
          aria-hidden="true"
          v-html="highlightedRequest"
        ></pre>
        <!-- eslint-enable vue/no-v-html -->
        <textarea
          v-model="requestJson"
          class="json-editor-box json-editor-input"
          spellcheck="false"
          aria-label="Request JSON"
          @scroll="syncRequestScroll"
        />
      </div>
      <p
        v-if="requestError"
        class="mt-2 rounded-md border border-signal-red/30 bg-signal-red/10 p-2 text-xs font-bold text-signal-red"
      >
        {{ requestError }}
      </p>
    </section>

    <section class="panel min-w-0 rounded-xl p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-lg font-black">Response</h3>
        <div class="flex items-center gap-2">
          <span
            class="inline-flex h-8 items-center gap-1 rounded-md px-2 font-mono text-xs font-black uppercase"
            :class="statusClass"
          >
            <Loader2 v-if="response.status === 'loading'" class="h-3.5 w-3.5 animate-spin" />
            <CheckCircle2 v-else-if="response.status === 'ok'" class="h-3.5 w-3.5" />
            <ServerCrash
              v-else-if="response.status === 'failed' || String(response.status).startsWith('HTTP')"
              class="h-3.5 w-3.5"
            />
            {{ response.status }}
          </span>
          <button
            ref="responseMaximizeBtn"
            class="icon-button"
            type="button"
            title="Maximize response"
            aria-label="Maximize response"
            :disabled="!responseText"
            @click="responseFullscreen = true"
          >
            <Maximize2 class="h-4 w-4" />
          </button>
          <button
            class="icon-button"
            type="button"
            title="Copy response JSON"
            :disabled="!response.payload"
            @click="$emit('copyResponse')"
          >
            <Clipboard class="h-4 w-4" />
          </button>
        </div>
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -- highlightJson() escapes all source text; only its own generated <span> wrappers are unescaped. -->
      <pre v-if="responseText" class="code-pane" v-html="highlightedResponse"></pre>
      <div v-else class="empty-pane">
        Telegram response will appear here as syntax-highlighted JSON.
      </div>
    </section>

    <FullscreenModal v-model:open="requestFullscreen" title="Request JSON">
      <div class="code-pane json-editor-shell max-h-none min-h-0 w-full flex-1 text-base leading-7">
        <!-- eslint-disable vue/no-v-html -- highlightJson() escapes all source text; only its own generated <span> wrappers are unescaped. -->
        <pre
          ref="requestFullscreenBackdropEl"
          class="json-editor-box json-editor-backdrop"
          aria-hidden="true"
          v-html="highlightedRequest"
        ></pre>
        <!-- eslint-enable vue/no-v-html -->
        <textarea
          v-model="requestJson"
          class="json-editor-box json-editor-input"
          spellcheck="false"
          aria-label="Request JSON (fullscreen)"
          @scroll="syncRequestFullscreenScroll"
        />
      </div>
      <p
        v-if="requestError"
        class="mt-2 shrink-0 rounded-md border border-signal-red/30 bg-signal-red/10 p-2 text-xs font-bold text-signal-red"
      >
        {{ requestError }}
      </p>
    </FullscreenModal>

    <FullscreenModal v-model:open="responseFullscreen" title="Response JSON">
      <template #actions>
        <button
          class="icon-button"
          type="button"
          title="Copy response JSON"
          :disabled="!response.payload"
          @click="$emit('copyResponse')"
        >
          <Clipboard class="h-4 w-4" />
        </button>
      </template>
      <!-- eslint-disable vue/no-v-html -- highlightJson() escapes all source text; only its own generated <span> wrappers are unescaped. -->
      <pre
        v-if="responseText"
        class="code-pane max-h-none min-h-0 w-full flex-1 text-base leading-7"
        v-html="highlightedResponse"
      ></pre>
      <!-- eslint-enable vue/no-v-html -->
      <div v-else class="empty-pane">
        Telegram response will appear here as syntax-highlighted JSON.
      </div>
    </FullscreenModal>
  </aside>
</template>

<style>
/*
 * Editable request panel: a transparent <textarea> is stacked directly on
 * top of a highlighted-HTML <pre> "backdrop". The textarea keeps real focus,
 * selection, and scrolling; its own text is rendered invisible via
 * `color: transparent` so the colored backdrop text shows through in its
 * place, with `caret-color` kept opaque so the cursor is still visible.
 *
 * `.json-editor-box` is the single source of truth for the shared box model
 * (padding/border/whitespace handling/font) so the two stacked layers can
 * never drift out of pixel alignment with each other.
 */
.json-editor-shell {
  position: relative;
}

/* .code-pane normally owns its own padding; here padding moves onto the two
   stacked `.json-editor-box` layers instead, so override it back to 0 on the
   shell (and stop the shell itself from scrolling — the textarea scrolls). */
.code-pane.json-editor-shell {
  padding: 0;
  overflow: hidden;
}

.json-editor-box {
  position: absolute;
  inset: 0;
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  margin: 0;
  border: 0;
  padding: 1rem;
  font: inherit;
  line-height: inherit;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  tab-size: 2;
}

.json-editor-backdrop {
  overflow: hidden;
  pointer-events: none;
  color: #f7f7f7; /* paper.100 */
}

.json-editor-input {
  overflow: auto;
  resize: none;
  outline: none;
  background: transparent;
  color: transparent;
  caret-color: #ffffff; /* paper.50 */
}

.json-editor-input::selection {
  background-color: rgba(94, 176, 243, 0.35); /* signal.blueBright */
}

/* JSON token colors — tuned for the always-dark .code-pane background.
   Hex values match tailwind.config.ts's `signal`/`paper` palette. */
.tok-key {
  color: #5eb0f3; /* signal.blueBright */
}

.tok-string {
  color: #a9e34b; /* signal.lime */
}

.tok-number {
  color: #f5b84b; /* signal.amber */
}

.tok-boolean {
  color: #3dd6c6; /* signal.cyan */
  font-weight: 600;
}

.tok-null {
  color: #ff5d4f; /* signal.red */
  font-weight: 600;
}

.tok-punct {
  color: #919ba6; /* paper.300 */
}
</style>
