<script setup lang="ts">
import { Info } from '@lucide/vue';
import { nextTick, ref, useId, useTemplateRef, watch } from 'vue';

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
const tooltipId = useId();
const triggerRef = useTemplateRef<HTMLButtonElement>('triggerRef');
const tooltipRef = useTemplateRef<HTMLElement>('tooltipRef');
const tooltipOpen = ref(false);
const tooltipPosition = ref({ left: '0px', top: '0px' });

async function showTooltip() {
  tooltipOpen.value = true;
  await nextTick();
  const trigger = triggerRef.value;
  const tooltip = tooltipRef.value;
  if (!trigger || !tooltip) return;
  const anchor = trigger.getBoundingClientRect();
  const bounds = tooltip.getBoundingClientRect();
  const margin = parseFloat(getComputedStyle(tooltip).getPropertyValue('--tooltip-margin'));
  const left = Math.max(
    margin,
    Math.min(
      anchor.left + (anchor.width - bounds.width) / 2,
      window.innerWidth - bounds.width - margin,
    ),
  );
  const top =
    anchor.top >= bounds.height + margin * 2
      ? anchor.top - bounds.height - margin
      : Math.min(anchor.bottom + margin, window.innerHeight - bounds.height - margin);
  tooltipPosition.value = { left: `${left}px`, top: `${Math.max(margin, top)}px` };
}
function hideTooltip() {
  tooltipOpen.value = false;
}
watch(tooltipOpen, (isOpen, _previous, onCleanup) => {
  if (!isOpen) return;
  window.addEventListener('scroll', hideTooltip, true);
  window.addEventListener('resize', hideTooltip);
  onCleanup(() => {
    window.removeEventListener('scroll', hideTooltip, true);
    window.removeEventListener('resize', hideTooltip);
  });
});
</script>

<template>
  <component
    :is="as"
    :for="as === 'label' ? htmlFor : undefined"
    class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5"
    :class="size === 'lg' ? 'font-black' : 'text-ink-700 dark:text-paper-300 text-xs font-bold'"
  >
    <span class="min-w-0 wrap-anywhere">{{ name }}</span>
    <span v-if="required" class="text-signal-red">*</span>
    <span
      v-if="type"
      class="inline-flex shrink-0"
      @mouseenter="showTooltip"
      @mouseleave="hideTooltip"
      @focusin="showTooltip"
      @focusout="hideTooltip"
      @keydown.esc.stop="hideTooltip"
    >
      <button
        ref="triggerRef"
        type="button"
        class="text-ink-700/50 hover:text-signal-blueHover focus:text-signal-blueHover dark:text-paper-300/50 dark:hover:text-signal-blueBright dark:focus:text-signal-blueBright inline-flex items-center justify-center rounded-full transition focus:outline-none"
        :class="size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'"
        :aria-label="`Type: ${type}`"
        :aria-describedby="tooltipOpen ? tooltipId : undefined"
      >
        <Info :class="size === 'lg' ? 'h-3.5 w-3.5' : 'h-3 w-3'" />
      </button>
      <Teleport to="body">
        <span
          v-if="tooltipOpen"
          :id="tooltipId"
          ref="tooltipRef"
          role="tooltip"
          class="field-tooltip"
          :style="tooltipPosition"
          >{{ type }}</span
        >
      </Teleport>
    </span>
  </component>
</template>
