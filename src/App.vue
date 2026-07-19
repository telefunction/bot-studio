<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue';
import { Bot, Moon, Sun, Monitor, Github, Send } from 'lucide-vue-next';
import ExpandableText from '@/components/ExpandableText.vue';
import MethodSidebar from '@/components/MethodSidebar.vue';
import TokenBox from '@/components/TokenBox.vue';
import ParameterForm from '@/components/ParameterForm.vue';
import ResultRail from '@/components/ResultRail.vue';
import ToastStack from '@/components/ToastStack.vue';
import NotFoundView from '@/components/NotFoundView.vue';
import { useTelegramStudio } from '@/composables/useTelegramStudio';
import { navigateOnClick } from '@/lib/navigation';

const studio = useTelegramStudio();
const {
  schema,
  selected,
  values,
  requestJson,
  requestJsonError,
  token,
  search,
  category,
  categories,
  filteredMethods,
  formError,
  response,
  displayResponse,
  loadingSchema,
  notices,
  notFound,
  notFoundPath,
  notFoundSuggestions,
  loadSchema,
  goHome,
  selectMethod,
  submit,
  copy,
} = studio;

const homeHref = import.meta.env.BASE_URL;

function onLogoClick(event: MouseEvent) {
  if (!navigateOnClick(event)) return;
  goHome();
}
const theme = ref(localStorage.getItem('bot-studio.theme') || 'system');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const systemPrefersDark = ref(systemDark.matches);

const resolvedTheme = computed(() =>
  theme.value === 'system' ? (systemPrefersDark.value ? 'dark' : 'light') : theme.value,
);
const themeIcon = computed(() =>
  theme.value === 'dark' ? Moon : theme.value === 'light' ? Sun : Monitor,
);
const themeLabel = computed(() =>
  theme.value === 'dark' ? 'Dark' : theme.value === 'light' ? 'Light' : 'System',
);

const themeOrder = ['system', 'light', 'dark'];
function cycleTheme() {
  const index = themeOrder.indexOf(theme.value);
  theme.value = themeOrder[(index + 1) % themeOrder.length];
}

function handleSystemThemeChange(event: MediaQueryListEvent) {
  systemPrefersDark.value = event.matches;
}

watch(theme, () => {
  localStorage.setItem('bot-studio.theme', theme.value);
});

watchEffect(() => {
  document.documentElement.dataset.theme = resolvedTheme.value;
  document.documentElement.dataset.themeMode = theme.value;
});

onMounted(async () => {
  systemDark.addEventListener('change', handleSystemThemeChange);
  await loadSchema();
});

onUnmounted(() => {
  systemDark.removeEventListener('change', handleSystemThemeChange);
});
</script>

<template>
  <div class="app-shell">
    <ToastStack :notices="notices" />

    <header
      class="sticky top-0 z-30 border-b border-ink-950/[0.08] bg-paper-50/[0.84] px-4 py-3 backdrop-blur-[25px] dark:border-paper-50/[0.08] dark:bg-[var(--page-bg)] dark:backdrop-blur-none sm:px-6"
    >
      <div class="mx-auto flex w-full max-w-[1540px] flex-row items-center justify-between gap-3">
        <a
          :href="homeHref"
          class="flex min-w-0 items-center gap-3 rounded-lg transition hover:opacity-80 focus:outline-none focus-visible:ring-4 focus-visible:ring-signal-blue/15 dark:focus-visible:ring-signal-blueDark/25"
          aria-label="Bot Studio home"
          @click="onLogoClick"
        >
          <div
            class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-signal-blue to-signal-blueHover text-paper-50 dark:from-signal-blueDark dark:to-signal-blueBright"
          >
            <Bot class="h-6 w-6" />
          </div>
          <div class="min-w-0">
            <h1 class="truncate text-xl font-black tracking-normal">Bot Studio</h1>
          </div>
        </a>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="group/theme icon-button relative"
            :aria-label="`Theme: ${themeLabel}. Click to switch.`"
            :title="`Theme: ${themeLabel}. Click to switch.`"
            @click="cycleTheme"
          >
            <component :is="themeIcon" class="h-4 w-4" />
            <span
              role="tooltip"
              class="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md border border-ink-950/[0.08] bg-paper-50 px-2 py-1 text-xs font-bold text-ink-950 opacity-0 shadow-soft transition duration-150 group-hover/theme:translate-y-0 group-hover/theme:opacity-100 group-focus-visible/theme:translate-y-0 group-focus-visible/theme:opacity-100 dark:border-paper-50/[0.08] dark:bg-navy-800 dark:text-paper-50 dark:shadow-darkSoft"
            >
              {{ themeLabel }}
            </span>
          </button>
          <a
            class="icon-button"
            href="https://github.com/telefunction/bot-studio"
            target="_blank"
            rel="noreferrer"
            title="telefunction"
            aria-label="View Bot Studio source on GitHub"
          >
            <Github class="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>

    <main
      class="mx-auto grid w-full max-w-[1540px] grid-cols-1 gap-4 p-3 sm:p-4 xl:grid-cols-[19rem_minmax(0,1.7fr)_23rem]"
    >
      <MethodSidebar
        v-model:search="search"
        v-model:category="category"
        :categories="categories"
        :methods="filteredMethods"
        :selected-name="selected?.name"
        :loading="loadingSchema"
        @select="selectMethod"
      />

      <section class="panel rounded-xl p-4 sm:p-5">
        <NotFoundView
          v-if="notFound"
          :path="notFoundPath"
          :suggestions="notFoundSuggestions"
          @select="selectMethod"
        />
        <template v-else>
          <div class="border-b border-ink-950/[0.08] pb-5 dark:border-paper-50/[0.08]">
            <div class="flex min-w-0 items-start justify-between gap-3">
              <div class="min-w-0">
                <h2
                  class="break-words text-3xl font-black leading-none tracking-normal sm:text-5xl"
                >
                  {{ selected?.name || 'Select a method' }}
                </h2>
                <ExpandableText
                  tag="p"
                  class="mt-3 max-w-4xl text-sm leading-7 text-ink-700 dark:text-paper-300"
                  :text="
                    selected?.description ||
                    'Search or browse the generated Telegram Bot API schema, then choose a method to build a request.'
                  "
                  :lines="3"
                />
              </div>
              <a
                class="icon-button"
                :href="
                  selected?.officialUrl || schema?.source || 'https://core.telegram.org/bots/api'
                "
                target="_blank"
                rel="noreferrer"
                title="Official docs"
              >
                ↗
              </a>
            </div>
          </div>

          <TokenBox v-model="token" :method-name="selected?.name" />

          <form class="mt-5" @submit.prevent="submit">
            <ParameterForm v-model="values" :method="selected" :schema="schema" />

            <div
              v-if="formError"
              class="mt-4 rounded-lg border border-signal-red/30 bg-signal-red/10 p-3 text-sm font-semibold text-signal-red"
            >
              {{ formError }}
            </div>

            <div class="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-signal-blue bg-signal-blue px-4 font-black text-paper-50 transition hover:-translate-y-0.5 hover:bg-signal-blueHover disabled:hover:translate-y-0 dark:border-signal-blueDark dark:bg-signal-blueDark dark:hover:bg-signal-blueHover"
                type="submit"
                :disabled="!selected || response.status === 'loading'"
              >
                <Send class="h-4 w-4" />
                {{ response.status === 'loading' ? 'Sending...' : 'Submit to Telegram' }}
              </button>
            </div>
          </form>
        </template>
      </section>

      <ResultRail
        v-model:request-json="requestJson"
        :request-error="requestJsonError"
        :response="displayResponse"
        @copy-request="copy(requestJson, 'Request JSON')"
        @copy-response="
          displayResponse.payload &&
          copy(JSON.stringify(displayResponse.payload, null, 2), 'Response JSON')
        "
      />
    </main>

    <footer
      class="mx-auto mt-8 flex w-full max-w-[1540px] flex-col items-center justify-center gap-2 px-4 pb-5 text-center text-sm font-semibold text-ink-700 dark:text-paper-300 sm:flex-row sm:justify-between sm:text-left"
    >
      <div>
        Powered by
        <a
          class="font-black text-signal-blueHover hover:underline dark:text-signal-blueDark dark:hover:text-signal-blueBright"
          href="https://github.com/telefunction"
          target="_blank"
          rel="noreferrer"
          aria-label="Telefunction on GitHub"
        >
          @Telefunction
        </a>
      </div>

      <div
        class="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap font-mono text-xs uppercase tracking-normal"
      >
        <span>{{ schema?.methodCount || 0 }} methods</span>
        <span>·</span>
        <span>{{ schema?.typeCount || 0 }} types</span>
      </div>
    </footer>
  </div>
</template>
