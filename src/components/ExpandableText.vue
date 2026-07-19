<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  useTemplateRef,
  watch,
} from 'vue';
import { ChevronDown } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    text: string;
    lines?: number;
    tag?: string;
  }>(),
  { lines: 3, tag: 'p' },
);

const clampClasses: Record<number, string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
};
const clampClass = computed(() => clampClasses[props.lines] ?? 'line-clamp-3');

const textId = useId();
const rootRef = useTemplateRef<HTMLElement>('rootRef');
const wrapperRef = useTemplateRef<HTMLElement>('wrapperRef');
const textRef = useTemplateRef<HTMLElement>('textRef');

const expanded = ref(false);
const displayExpanded = ref(false);
const overflowing = ref(false);
const collapsedHeight = ref(0);
const fullHeight = ref(0);
const currentMaxHeight = ref(0);

const wrapperStyle = computed(() =>
  overflowing.value ? { maxHeight: `${currentMaxHeight.value}px` } : {},
);

async function measure() {
  await nextTick();
  const el = textRef.value;
  // Guard on `displayExpanded`, not `expanded`. `displayExpanded` is what actually
  // controls whether the clamp class is present on the DOM node below, and it stays
  // true for the whole collapse transition (it's only reset in onTransitionEnd) even
  // though `expanded` already flips to false the instant "Show less" is clicked. The
  // ResizeObserver on the root fires repeatedly during that collapse animation
  // (the wrapper's own height is changing every frame), and if this were allowed to
  // run while the text node is still unclamped, clientHeight/scrollHeight would both
  // read the full height, collapsing `overflowing` to false and corrupting state
  // mid-animation. Keying off `displayExpanded` closes that window exactly.
  if (!el || displayExpanded.value) return;
  collapsedHeight.value = el.clientHeight;
  fullHeight.value = el.scrollHeight;
  overflowing.value = fullHeight.value - collapsedHeight.value > 1;
  if (overflowing.value) currentMaxHeight.value = collapsedHeight.value;
}

function toggle() {
  if (!overflowing.value) return;
  if (expanded.value) {
    expanded.value = false;
    currentMaxHeight.value = collapsedHeight.value;
  } else {
    displayExpanded.value = true;
    expanded.value = true;
    currentMaxHeight.value = fullHeight.value;
  }
}

// Lets a click anywhere on the (clamped) text body toggle expansion too, not just the
// chip button — but a click that's the tail end of a text-selection drag must NOT toggle,
// or selecting text would keep collapsing/expanding the block out from under the user.
function onTextClick() {
  if (!overflowing.value) return;
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) return;
  toggle();
}

function onTransitionEnd(event: TransitionEvent) {
  if (event.target !== wrapperRef.value || event.propertyName !== 'max-height') return;
  if (!expanded.value) {
    displayExpanded.value = false;
    // Re-measure now that the clamp class is back on the DOM, so a stale
    // collapsedHeight/fullHeight (e.g. from a resize that happened mid-animation,
    // while measuring was correctly suppressed) can't linger indefinitely.
    measure();
  }
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  measure();
  resizeObserver = new ResizeObserver(() => measure());
  if (rootRef.value) resizeObserver.observe(rootRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

watch(
  () => props.text,
  () => {
    expanded.value = false;
    displayExpanded.value = false;
    measure();
  },
);
</script>

<template>
  <component :is="tag" ref="rootRef" class="group relative">
    <div
      ref="wrapperRef"
      :class="[
        'overflow-hidden transition-[max-height] duration-300 ease-out',
        overflowing ? 'cursor-pointer' : '',
      ]"
      :style="wrapperStyle"
      @transitionend="onTransitionEnd"
      @click="onTextClick"
    >
      <div :id="textId" ref="textRef" :class="displayExpanded ? '' : clampClass">{{ text }}</div>
    </div>
    <template v-if="overflowing">
      <span
        v-if="!displayExpanded"
        aria-hidden="true"
        class="pointer-events-none absolute bottom-0 right-0 h-5 w-10 rounded-md bg-gradient-to-l from-paper-50 to-transparent dark:from-navy-700"
      ></span>
      <button
        type="button"
        class="absolute bottom-0 right-0 inline-flex h-5 w-5 items-center justify-center rounded-md border border-ink-950/[0.08] bg-paper-100 text-signal-blue shadow-soft transition hover:border-signal-blueHover hover:bg-signal-blue/10 hover:text-signal-blueHover group-hover:border-signal-blueHover group-hover:bg-signal-blue/10 group-hover:text-signal-blueHover focus:outline-none focus:ring-4 focus:ring-signal-blue/15 dark:border-paper-50/[0.08] dark:bg-navy-800 dark:text-signal-blueDark dark:shadow-darkSoft dark:hover:border-signal-blueBright dark:hover:bg-signal-blueDark/15 dark:hover:text-signal-blueBright dark:group-hover:border-signal-blueBright dark:group-hover:bg-signal-blueDark/15 dark:group-hover:text-signal-blueBright dark:focus:ring-signal-blueDark/25"
        :aria-expanded="expanded"
        :aria-controls="textId"
        :aria-label="expanded ? 'Show less' : 'Show more'"
        :title="expanded ? 'Show less' : 'Show more'"
        @click="toggle"
      >
        <ChevronDown
          class="h-3 w-3 transition-transform duration-200"
          :class="{ 'rotate-180': expanded }"
        />
      </button>
    </template>
  </component>
</template>
