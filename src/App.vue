<script setup lang="ts">
import {
  computed,
  nextTick,
  onErrorCaptured,
  onMounted,
  onUnmounted,
  ref,
  watch,
  watchEffect,
} from 'vue';
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
const mobileSection = ref<'methods' | 'builder' | 'results'>('methods');
const resultTab = ref<'request' | 'response'>('request');
const mobileSections = [
  { id: 'methods', label: 'Methods' },
  { id: 'builder', label: 'Request' },
  { id: 'results', label: 'Response' },
] as const;

function onSelectMethod(method: Parameters<typeof selectMethod>[0]) {
  selectMethod(method);
  mobileSection.value = 'builder';
  resultTab.value = 'request';
}

function setMobileSection(section: (typeof mobileSections)[number]['id']) {
  mobileSection.value = section;
  if (section === 'builder') resultTab.value = 'request';
  if (section === 'results') resultTab.value = 'response';
}

async function submitAndShowResult() {
  const pendingRequest = submit();
  await nextTick();
  if (response.value.status === 'loading') setMobileSection('results');
  await pendingRequest;
}

function onLogoClick(event: MouseEvent) {
  if (!navigateOnClick(event)) return;
  goHome();
  mobileSection.value = 'methods';
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
  if (selected.value || notFound.value) mobileSection.value = 'builder';
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
      class="border-ink-950/8 dark:border-paper-50/8 sticky top-0 z-30 border-b bg-(--page-bg)/90 px-4 py-3 sm:px-6"
    >
      <div class="mx-auto flex w-full max-w-[1680px] flex-row items-center justify-between gap-3">
        <a
          :href="homeHref"
          class="group focus-visible:ring-signal-blue/15 dark:focus-visible:ring-signal-blueDark/25 flex min-w-0 items-center gap-3 rounded-lg transition focus:outline-none focus-visible:ring-4"
          aria-label="Bot Studio home"
          @click="onLogoClick"
        >
          <div class="relative shrink-0">
            <span
              class="bg-signal-blue/10 dark:bg-signal-blueDark/15 absolute inset-0 -z-10 rounded-xl"
              aria-hidden="true"
            />
            <div
              class="bg-signal-blue text-paper-50 dark:bg-signal-blueDark relative grid h-10 w-10 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-[1.03]"
            >
              <Bot class="h-6 w-6" />
            </div>
          </div>
          <div class="flex min-w-0 items-baseline gap-1.5">
            <h1
              class="from-ink-950 via-ink-950 to-signal-blueHover dark:from-paper-50 dark:via-paper-50 dark:to-signal-blueBright min-w-0 truncate bg-linear-to-r bg-clip-text text-xl font-black tracking-normal text-transparent"
            >
              Bot Studio
            </h1>
            <span
              class="text-ink-700 dark:text-paper-300 hidden shrink-0 font-mono text-xs font-bold sm:inline"
            >
              v{{ appVersion }}
            </span>
          </div>
        </a>

        <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
              class="border-ink-950/8 bg-paper-50 text-ink-950 shadow-soft dark:border-paper-50/8 dark:bg-navy-800 dark:text-paper-50 dark:shadow-darkSoft pointer-events-none absolute top-full left-1/2 z-40 mt-2 -translate-x-1/2 translate-y-1 rounded-md border px-2 py-1 text-xs font-bold whitespace-nowrap opacity-0 transition duration-150 group-hover/theme:translate-y-0 group-hover/theme:opacity-100 group-focus-visible/theme:translate-y-0 group-focus-visible/theme:opacity-100"
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

    <nav
      class="border-ink-950/8 dark:border-paper-50/8 sticky top-[65px] z-20 mx-auto grid w-full max-w-[1680px] grid-cols-3 gap-1 border-b bg-(--page-bg)/95 px-3 py-2 backdrop-blur-md xl:hidden"
      aria-label="Workspace sections"
    >
      <button
        v-for="section in mobileSections"
        :key="section.id"
        type="button"
        class="rounded-lg px-3 py-2.5 text-xs font-semibold transition"
        :class="
          mobileSection === section.id
            ? 'bg-paper-50 text-signal-blueHover dark:bg-navy-800 dark:text-signal-blueBright shadow-sm'
            : 'text-ink-700 dark:text-paper-300'
        "
        :aria-pressed="mobileSection === section.id"
        @click="setMobileSection(section.id)"
      >
        {{ section.label }}
      </button>
    </nav>

    <main
      v-if="fatalError"
      class="mx-auto flex w-full max-w-[1680px] flex-col items-center gap-3 p-10 text-center"
    >
      <TriangleAlert class="text-signal-red h-8 w-8" />
      <h2 class="text-2xl leading-none font-black tracking-normal">Something went wrong</h2>
      <p class="text-ink-700 dark:text-paper-300 max-w-md text-sm leading-7">
        Bot Studio hit an unexpected error and can't continue safely. Reloading should fix it.
      </p>
      <button
        type="button"
        class="border-signal-blue from-signal-blue to-signal-blueHover text-paper-50 hover:shadow-glow dark:border-signal-blueDark dark:from-signal-blueDark dark:to-signal-blueBright dark:hover:shadow-glowDark mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border bg-linear-to-r px-4 font-black transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        @click="reloadPage"
      >
        Reload
      </button>
    </main>

    <main
      v-else
      class="mx-auto grid w-full max-w-[1680px] grid-cols-1 items-start gap-4 p-3 sm:gap-5 sm:p-5 xl:grid-cols-[17rem_minmax(0,1.45fr)_minmax(22rem,0.9fr)] xl:p-6"
    >
      <MethodSidebar
        v-model:search="search"
        v-model:category="category"
        :class="mobileSection === 'methods' ? '' : 'hidden xl:block'"
        :categories="categories"
        :methods="filteredMethods"
        :selected-name="selected?.name"
        :loading="loadingSchema"
        @select="onSelectMethod"
      />

      <section :class="[mobileSection === 'builder' ? '' : 'hidden xl:block', 'panel p-4 sm:p-6']">
        <NotFoundView
          v-if="notFound"
          :path="notFoundPath"
          :suggestions="notFoundSuggestions"
          @select="onSelectMethod"
        />
        <template v-else>
          <div class="border-ink-950/8 dark:border-paper-50/8 border-b pb-5">
            <div class="flex min-w-0 items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="section-kicker mb-2">Method workspace</p>
                <h2
                  class="text-2xl leading-tight font-bold tracking-tight wrap-break-word sm:text-3xl"
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

          <form class="mt-5" @submit.prevent="submitAndShowResult">
            <ParameterForm v-model="values" :method="selected" :schema="schema" />

            <div
              v-if="formError"
              class="border-signal-red/30 bg-signal-red/10 text-signal-red mt-4 rounded-lg border p-3 text-sm font-semibold"
            >
              {{ formError }}
            </div>

            <div class="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                class="border-signal-blue from-signal-blue to-signal-blueHover text-paper-50 hover:shadow-glow dark:border-signal-blueDark dark:from-signal-blueDark dark:to-signal-blueBright dark:hover:shadow-glowDark inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border bg-linear-to-r px-4 font-black transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:hover:translate-y-0 disabled:hover:shadow-none"
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
        v-model:active-tab="resultTab"
        :class="mobileSection === 'results' ? '' : 'hidden xl:block'"
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
      class="text-ink-700 dark:text-paper-300 mx-auto mt-5 flex w-full max-w-[1680px] flex-col items-center justify-center gap-2 px-6 pb-5 text-center text-xs font-medium sm:flex-row sm:justify-between sm:text-left"
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
