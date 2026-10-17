<script setup lang="ts">
import { computed, onErrorCaptured, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue';
import { Bot, Moon, Sun, Monitor, CodeXml, Send, TriangleAlert } from '@lucide/vue';
import { version as appVersion } from '../package.json';
import ExpandableText from '@/components/ExpandableText.vue';
import MethodSidebar from '@/components/MethodSidebar.vue';
import TokenBox from '@/components/TokenBox.vue';
import ParameterForm from '@/components/ParameterForm.vue';
import ResultRail from '@/components/ResultRail.vue';
import ToastStack from '@/components/ToastStack.vue';
import NotFoundView from '@/components/NotFoundView.vue';
import PrivacyNoticeModal from '@/components/PrivacyNoticeModal.vue';
import { useTelegramStudio } from '@/composables/useTelegramStudio';
import { navigateOnClick } from '@/lib/navigation';
import { getCookie, PRIVACY_NOTICE_COOKIE } from '@/lib/cookies';

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

const privacyNoticeOpen = ref(false);

const fatalError = ref(false);
onErrorCaptured((error) => {
  console.error(error);
  fatalError.value = true;
  return false;
});
function reloadPage() {
  window.location.reload();
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
  if (!getCookie(PRIVACY_NOTICE_COOKIE)) {
    privacyNoticeOpen.value = true;
  }
  await loadSchema();
});

onUnmounted(() => {
  systemDark.removeEventListener('change', handleSystemThemeChange);
});
</script>

<template>
  <div class="app-shell">
    <ToastStack :notices="notices" />
    <PrivacyNoticeModal v-model:open="privacyNoticeOpen" />

    <header
      class="border-ink-950/[0.08] bg-paper-50/[0.84] dark:border-paper-50/[0.08] sticky top-0 z-30 border-b px-4 py-3 backdrop-blur-[25px] sm:px-6 dark:bg-[var(--page-bg)] dark:backdrop-blur-none"
    >
      <div class="mx-auto flex w-full max-w-[1540px] flex-row items-center justify-between gap-3">
        <a
          :href="homeHref"
          class="group focus-visible:ring-signal-blue/15 dark:focus-visible:ring-signal-blueDark/25 flex min-w-0 items-center gap-3 rounded-lg transition focus:outline-none focus-visible:ring-4"
          aria-label="Bot Studio home"
          @click="onLogoClick"
        >
          <div class="relative shrink-0">
            <span
              class="animate-breathe bg-signal-blue/50 dark:bg-signal-blueDark/50 absolute inset-0 -z-10 rounded-xl blur-md"
              aria-hidden="true"
            />
            <div
              class="from-signal-blue to-signal-blueHover text-paper-50 shadow-glow dark:from-signal-blueDark dark:to-signal-blueBright dark:shadow-glowDark relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br transition-transform duration-300 ease-out group-hover:scale-105 group-hover:-rotate-3"
            >
              <Bot class="h-6 w-6" />
            </div>
          </div>
          <div class="flex min-w-0 items-baseline gap-1.5">
            <h1
              class="from-ink-950 via-ink-950 to-signal-blueHover dark:from-paper-50 dark:via-paper-50 dark:to-signal-blueBright min-w-0 truncate bg-gradient-to-r bg-clip-text text-xl font-black tracking-normal text-transparent"
            >
              Bot Studio
            </h1>
            <span class="text-ink-700 dark:text-paper-300 shrink-0 font-mono text-xs font-bold">
              v{{ appVersion }}
            </span>
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
              class="border-ink-950/[0.08] bg-paper-50 text-ink-950 shadow-soft dark:border-paper-50/[0.08] dark:bg-navy-800 dark:text-paper-50 dark:shadow-darkSoft pointer-events-none absolute top-full left-1/2 z-40 mt-2 -translate-x-1/2 translate-y-1 rounded-md border px-2 py-1 text-xs font-bold whitespace-nowrap opacity-0 transition duration-150 group-hover/theme:translate-y-0 group-hover/theme:opacity-100 group-focus-visible/theme:translate-y-0 group-focus-visible/theme:opacity-100"
            >
              {{ themeLabel }}
            </span>
          </button>
          <button
            type="button"
            class="icon-button"
            title="Privacy & security notice"
            aria-label="Privacy & security notice"
            @click="privacyNoticeOpen = true"
          >
            <TriangleAlert class="h-4 w-4" />
          </button>
          <a
            class="icon-button"
            href="https://github.com/telefunction/bot-studio"
            target="_blank"
            rel="noreferrer"
            title="telefunction"
            aria-label="View Bot Studio source on GitHub"
          >
            <CodeXml class="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>

    <main
      v-if="fatalError"
      class="mx-auto flex w-full max-w-[1540px] flex-col items-center gap-3 p-10 text-center"
    >
      <TriangleAlert class="text-signal-red h-8 w-8" />
      <h2 class="text-2xl leading-none font-black tracking-normal">Something went wrong</h2>
      <p class="text-ink-700 dark:text-paper-300 max-w-md text-sm leading-7">
        Bot Studio hit an unexpected error and can't continue safely. Reloading should fix it.
      </p>
      <button
        type="button"
        class="border-signal-blue from-signal-blue to-signal-blueHover text-paper-50 hover:shadow-glow dark:border-signal-blueDark dark:from-signal-blueDark dark:to-signal-blueBright dark:hover:shadow-glowDark mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border bg-gradient-to-r px-4 font-black transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        @click="reloadPage"
      >
        Reload
      </button>
    </main>

    <main
      v-else
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

      <section class="panel rounded-2xl p-4 sm:p-5">
        <NotFoundView
          v-if="notFound"
          :path="notFoundPath"
          :suggestions="notFoundSuggestions"
          @select="selectMethod"
        />
        <template v-else>
          <div class="border-ink-950/[0.08] dark:border-paper-50/[0.08] border-b pb-5">
            <div class="flex min-w-0 items-start justify-between gap-3">
              <div class="min-w-0">
                <h2
                  class="text-3xl leading-none font-black tracking-normal break-words sm:text-5xl"
                >
                  {{ selected?.name || 'Select a method' }}
                </h2>
                <ExpandableText
                  tag="p"
                  class="text-ink-700 dark:text-paper-300 mt-3 max-w-4xl text-sm leading-7"
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
              class="border-signal-red/30 bg-signal-red/10 text-signal-red mt-4 rounded-lg border p-3 text-sm font-semibold"
            >
              {{ formError }}
            </div>

            <div class="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                class="border-signal-blue from-signal-blue to-signal-blueHover text-paper-50 hover:shadow-glow dark:border-signal-blueDark dark:from-signal-blueDark dark:to-signal-blueBright dark:hover:shadow-glowDark inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border bg-gradient-to-r px-4 font-black transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:hover:translate-y-0 disabled:hover:shadow-none"
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
      class="text-ink-700 dark:text-paper-300 mx-auto mt-8 flex w-full max-w-[1540px] flex-col items-center justify-center gap-2 px-4 pb-5 text-center text-sm font-semibold sm:flex-row sm:justify-between sm:text-left"
    >
      <div>
        Powered by
        <a
          class="text-signal-blueHover dark:text-signal-blueDark dark:hover:text-signal-blueBright font-black hover:underline"
          href="https://github.com/telefunction"
          target="_blank"
          rel="noreferrer"
          aria-label="Telefunction on GitHub"
        >
          @Telefunction
        </a>
      </div>

      <div
        class="flex flex-nowrap items-center justify-center gap-2 font-mono text-xs tracking-normal whitespace-nowrap uppercase"
      >
        <span>{{ schema?.methodCount || 0 }} methods</span>
        <span>·</span>
        <span>{{ schema?.typeCount || 0 }} types</span>
      </div>
    </footer>
  </div>
</template>
