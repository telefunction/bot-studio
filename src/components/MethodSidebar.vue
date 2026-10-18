<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { Search, SlidersHorizontal } from '@lucide/vue';
import type { TelegramMethod } from '@/types/schema';
import { navigateOnClick } from '@/lib/navigation';

const props = defineProps<{
  methods: TelegramMethod[];
  categories: string[];
  selectedName?: string;
  loading: boolean;
}>();

const search = defineModel<string>('search', { required: true });
const category = defineModel<string>('category', { required: true });
const emit = defineEmits<{ select: [method: TelegramMethod] }>();

// Each method card is a real <a href="methodName"> (relative, no leading
// slash) so it's crawlable, right-click-copyable, and openable in a new tab.
// The href is intentionally left for the browser to resolve against the
// current document's URL - see vite.config.ts / useTelegramStudio.ts for why
// that's safe under the GitHub Pages project-subpath deployment.
function onMethodClick(event: MouseEvent, method: TelegramMethod) {
  if (!navigateOnClick(event)) return;
  emit('select', method);
}

// Progressive rendering: mounting ~185 buttons in one synchronous pass is a
// single long main-thread task. Reveal them in small chunks across animation
// frames instead, so no single task blocks the main thread for long.
const CHUNK_SIZE = 40;
const visibleCount = ref(0);
const visibleMethods = computed(() => props.methods.slice(0, visibleCount.value));

let rafId: number | null = null;

function cancelPendingGrowth() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function growNextFrame() {
  if (visibleCount.value >= props.methods.length) {
    rafId = null;
    return;
  }
  rafId = requestAnimationFrame(() => {
    visibleCount.value = Math.min(visibleCount.value + CHUNK_SIZE, props.methods.length);
    growNextFrame();
  });
}

function restartProgressiveReveal() {
  cancelPendingGrowth();
  // Show an initial chunk immediately (covers the visible scroll viewport so
  // there's no empty-then-fill flash), then keep growing frame by frame.
  visibleCount.value = Math.min(CHUNK_SIZE, props.methods.length);
  growNextFrame();
}

watch(() => props.methods, restartProgressiveReveal, { immediate: true });

onUnmounted(cancelPendingGrowth);
</script>

<template>
  <aside class="panel overflow-hidden p-3 sm:p-4 xl:sticky xl:top-20">
    <div class="mb-4 flex items-center justify-between px-1">
      <div>
        <h2 class="text-sm font-bold">Method library</h2>
        <p class="text-ink-700 dark:text-paper-300 mt-0.5 text-xs">Browse the Bot API</p>
      </div>
      <span
        class="bg-signal-blue/8 text-signal-blueHover dark:bg-signal-blueDark/15 dark:text-signal-blueBright rounded-md px-2 py-1 font-mono text-[0.68rem] font-bold"
      >
        {{ methods.length }}
      </span>
    </div>
    <div
      class="border-ink-950/8 bg-paper-100 focus-within:border-signal-blue focus-within:ring-signal-blue/10 dark:border-paper-50/8 dark:bg-navy-900 dark:focus-within:border-signal-blueDark dark:focus-within:ring-signal-blueDark/15 flex h-11 items-center gap-2 rounded-xl border px-3 transition focus-within:ring-4"
    >
      <Search class="text-ink-700 dark:text-paper-300 h-4 w-4 shrink-0" />
      <input
        v-model="search"
        class="min-w-0 flex-1 bg-transparent text-sm outline-none"
        type="search"
        placeholder="Search methods, params..."
      />
    </div>

    <div
      class="border-ink-950/8 bg-paper-100 dark:border-paper-50/8 dark:bg-navy-900 mt-2 flex h-11 items-center gap-2 rounded-xl border px-3"
    >
      <SlidersHorizontal class="text-ink-700 dark:text-paper-300 h-4 w-4 shrink-0" />
      <select
        v-model="category"
        class="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
        aria-label="Category"
      >
        <option v-for="item in categories" :key="item">{{ item }}</option>
      </select>
    </div>

    <div
      class="mt-3 grid max-h-[52vh] auto-rows-min content-start gap-1.5 overflow-y-auto pr-1 xl:max-h-[calc(100dvh-13rem)]"
    >
      <div v-if="loading" class="empty-pane">Loading Telegram schema...</div>
      <a
        v-for="method in visibleMethods"
        :key="method.name"
        :href="method.name"
        class="group relative min-w-0 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150"
        :class="
          selectedName === method.name
            ? 'border-signal-blue/30 bg-signal-blue/7 dark:border-signal-blueDark/35 dark:bg-signal-blueDark/10'
            : 'hover:border-ink-950/8 hover:bg-paper-100 dark:hover:border-paper-50/8 dark:hover:bg-navy-800 border-transparent'
        "
        :aria-current="selectedName === method.name ? 'page' : undefined"
        @click="onMethodClick($event, method)"
      >
        <strong class="block truncate text-sm font-black">{{ method.name }}</strong>
        <span class="text-ink-700 dark:text-paper-300 mt-1 block truncate text-xs leading-5">
          {{ method.description || 'No description available.' }}
        </span>
      </a>
      <div v-if="!loading && methods.length === 0" class="empty-pane">
        No methods match this search.
      </div>
    </div>
  </aside>
</template>
