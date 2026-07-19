<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-vue-next';
import type { Notice } from '@/types/schema';

defineProps<{ notices: Notice[] }>();

function toneClasses(tone: Notice['tone']) {
  if (tone === 'success')
    return 'border-signal-lime/30 bg-signal-lime/10 text-ink-950 dark:text-paper-50';
  if (tone === 'error')
    return 'border-signal-red/30 bg-signal-red/10 text-ink-950 dark:text-paper-50';
  if (tone === 'warning')
    return 'border-signal-amber/40 bg-signal-amber/10 text-ink-950 dark:text-paper-50';
  return 'border-signal-blue/30 bg-signal-blue/10 text-ink-950 dark:border-signal-blueDark/30 dark:bg-signal-blueDark/15 dark:text-paper-50';
}

function toneIcon(tone: Notice['tone']) {
  if (tone === 'success') return CheckCircle2;
  if (tone === 'error') return XCircle;
  if (tone === 'warning') return AlertTriangle;
  return Info;
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed right-3 top-3 z-50 grid w-[min(24rem,calc(100vw-1.5rem))] gap-2">
      <TransitionGroup
        enter-active-class="transition duration-200"
        enter-from-class="translate-y-2 opacity-0"
        leave-active-class="transition duration-150"
        leave-to-class="translate-y-2 opacity-0"
      >
        <article
          v-for="notice in notices"
          :key="notice.id"
          class="rounded-xl border p-3 shadow-soft backdrop-blur-xl dark:shadow-darkSoft"
          :class="toneClasses(notice.tone)"
        >
          <div class="flex gap-3">
            <component :is="toneIcon(notice.tone)" class="mt-0.5 h-5 w-5 shrink-0" />
            <div class="min-w-0">
              <strong class="block text-sm font-black">{{ notice.title }}</strong>
              <p class="mt-1 break-words text-xs leading-5 opacity-80">{{ notice.message }}</p>
            </div>
          </div>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
