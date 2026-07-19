<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { Search, SlidersHorizontal } from 'lucide-vue-next';
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
  <aside class="panel self-start overflow-hidden rounded-xl p-4">
    <div
      class="flex h-11 items-center gap-2 rounded-lg border border-ink-950/[0.08] bg-paper-100 px-3 transition focus-within:border-signal-blue focus-within:ring-4 focus-within:ring-signal-blue/15 dark:border-paper-50/[0.08] dark:bg-navy-900 dark:focus-within:border-signal-blueDark dark:focus-within:ring-signal-blueDark/25"
    >
      <Search class="h-4 w-4 shrink-0 text-ink-700 dark:text-paper-300" />
      <input
        v-model="search"
        class="min-w-0 flex-1 bg-transparent text-sm outline-none"
        type="search"
        placeholder="Search methods, params..."
      />
    </div>

    <div
      class="mt-3 flex h-11 items-center gap-2 rounded-lg border border-ink-950/[0.08] bg-paper-100 px-3 dark:border-paper-50/[0.08] dark:bg-navy-900"
    >
      <SlidersHorizontal class="h-4 w-4 shrink-0 text-ink-700 dark:text-paper-300" />
      <select
        v-model="category"
        class="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
        aria-label="Category"
      >
        <option v-for="item in categories" :key="item">{{ item }}</option>
      </select>
    </div>

    <div
      class="mt-4 grid h-[20rem] auto-rows-min content-start gap-2 overflow-y-auto pr-1 lg:h-[calc(100vh-14.5rem)]"
    >
      <div v-if="loading" class="empty-pane">Loading Telegram schema...</div>
      <a
        v-for="method in visibleMethods"
        :key="method.name"
        :href="method.name"
        class="group min-w-0 rounded-lg border p-3 text-left transition hover:-translate-y-0.5"
        :class="
          selectedName === method.name
            ? 'border-signal-blue bg-signal-blue/10 dark:border-signal-blueDark dark:bg-signal-blueDark/15'
            : 'border-ink-950/[0.08] bg-paper-50 hover:border-signal-blue hover:bg-paper-100 dark:border-paper-50/[0.08] dark:bg-navy-800 dark:hover:border-signal-blueDark dark:hover:bg-navy-700'
        "
        :aria-current="selectedName === method.name ? 'page' : undefined"
        @click="onMethodClick($event, method)"
      >
        <strong class="block truncate text-sm font-black">{{ method.name }}</strong>
        <span class="mt-1 block truncate text-xs leading-5 text-ink-700 dark:text-paper-300">
          {{ method.description || 'No description available.' }}
        </span>
      </a>
      <div v-if="!loading && methods.length === 0" class="empty-pane">
        No methods match this search.
      </div>
    </div>
  </aside>
</template>
