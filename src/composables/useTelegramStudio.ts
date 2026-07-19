import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type {
  Notice,
  ParamValue,
  ResponseState,
  TelegramMethod,
  TelegramSchema,
} from '@/types/schema';
import {
  buildPreviewPayload,
  buildRequestInitFromPayload,
  dangerousMethods,
  defaultValues,
  fileParamValue,
  inferKind,
  jsonForDisplay,
  missingRequiredFromPayload,
  normalizeToken,
  parseRequestJson,
  suggestMethods,
} from '@/lib/telegram';

export function useTelegramStudio() {
  const schema = ref<TelegramSchema | null>(null);
  const selected = ref<TelegramMethod | null>(null);
  const values = ref<Record<string, ParamValue>>({});
  const requestJson = ref('{}');
  const requestJsonError = ref('');
  const token = ref('');
  const search = ref('');
  const category = ref('All');
  const formError = ref('');
  const loadingSchema = ref(true);
  const response = ref<ResponseState>({ status: 'waiting', payload: null, error: '' });
  const notices = ref<Notice[]>([]);
  let noticeId = 0;

  const categories = computed(() => [
    'All',
    ...new Set((schema.value?.methods ?? []).map((method) => method.category)),
  ]);

  const filteredMethods = computed(() => {
    const query = search.value.trim().toLowerCase();
    return (schema.value?.methods ?? []).filter((method) => {
      const categoryMatch = category.value === 'All' || method.category === category.value;
      const queryMatch =
        !query ||
        method.name.toLowerCase().includes(query) ||
        method.description.toLowerCase().includes(query) ||
        method.parameters.some((parameter) => parameter.name.toLowerCase().includes(query));
      return categoryMatch && queryMatch;
    });
  });

  let syncingFromRequest = false;
  let syncingFromValues = false;

  const knownParameterNames = computed(
    () => new Set((selected.value?.parameters ?? []).map((parameter) => parameter.name)),
  );

  function readRequestPayload() {
    const payload = parseRequestJson(requestJson.value);
    requestJsonError.value = '';
    return payload;
  }

  function valueFromRequest(
    parameter: TelegramMethod['parameters'][number],
    value: unknown,
  ): ParamValue {
    const kind = inferKind(parameter);
    if (kind === 'boolean') {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
      return Boolean(value);
    }

    if (kind === 'file') {
      const current = values.value[parameter.name];
      if (current && typeof current === 'object' && current.mode === 'file' && current.file)
        return current;
      return {
        mode: 'text',
        text: value === undefined || value === null ? '' : String(value),
        file: null,
      };
    }

    if (value === undefined || value === null) return '';
    return typeof value === 'object' ? jsonForDisplay(value) : String(value);
  }

  function payloadForSubmit() {
    const payload = readRequestPayload();
    for (const parameter of selected.value?.parameters ?? []) {
      if (inferKind(parameter) !== 'file') continue;
      const fileValue = fileParamValue(values.value[parameter.name]);
      if (fileValue instanceof File) payload[parameter.name] = fileValue;
    }
    return payload;
  }

  function syncRequestFromValues() {
    if (syncingFromRequest || requestJsonError.value) return;
    syncingFromValues = true;

    try {
      const formPayload = buildPreviewPayload(selected.value, values.value);
      const base = readRequestPayload();

      for (const name of knownParameterNames.value) {
        if (Object.hasOwn(formPayload, name)) {
          base[name] = formPayload[name];
        } else {
          delete base[name];
        }
      }

      requestJson.value = jsonForDisplay(base);
      requestJsonError.value = '';
    } finally {
      syncingFromValues = false;
    }
  }

  function syncValuesFromRequest() {
    if (syncingFromValues || !selected.value) return;

    let payload: Record<string, unknown>;
    try {
      payload = readRequestPayload();
    } catch (error) {
      requestJsonError.value = error instanceof Error ? error.message : 'Invalid request JSON.';
      return;
    }

    syncingFromRequest = true;
    try {
      const nextValues = { ...values.value };
      for (const parameter of selected.value.parameters) {
        if (Object.hasOwn(payload, parameter.name)) {
          nextValues[parameter.name] = valueFromRequest(parameter, payload[parameter.name]);
        } else {
          nextValues[parameter.name] = defaultValues(selected.value)[parameter.name];
        }
      }
      values.value = nextValues;
      requestJsonError.value = '';
    } finally {
      syncingFromRequest = false;
    }
  }

  watch(values, syncRequestFromValues, { deep: true });
  watch(requestJson, syncValuesFromRequest);

  // SEO / deep-link support: methods live at a URL of the form `/methodName`
  // (one path segment deep, resolved relative to wherever the app is hosted -
  // see the <a :href="method.name"> links in MethodSidebar.vue). These
  // helpers translate between that URL segment and a schema method, and keep
  // <title>/<meta name="description"> in sync with the current selection.
  const metaDescriptionEl =
    typeof document !== 'undefined' ? document.querySelector('meta[name="description"]') : null;
  const defaultTitle = typeof document !== 'undefined' ? document.title : 'Bot Studio';
  const defaultDescription = metaDescriptionEl?.getAttribute('content') ?? '';

  function pathSegments(pathname: string): string[] {
    return pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      });
  }

  // A non-empty segment that matches no method is a genuine 404 (as opposed
  // to the root path, where "no method" just means the landing state).
  const unresolvedPath = ref('');
  const notFound = computed(
    () => !loadingSchema.value && !!unresolvedPath.value && !selected.value,
  );
  const notFoundSuggestions = computed(() =>
    notFound.value ? suggestMethods(schema.value?.methods ?? [], unresolvedPath.value) : [],
  );

  // On a 404, ResultRail's Response panel doubles as the error display: it
  // gets a synthetic payload shaped like a real Telegram API error instead of
  // the actual (unused) request/response cycle, so the same "HTTP xxx" pill
  // and JSON-highlighted pane used for a real failed call apply here too.
  const displayResponse = computed<ResponseState>(() =>
    notFound.value
      ? {
          status: 'HTTP 404',
          payload: {
            ok: false,
            error_code: 404,
            description: `Bad Request: method "${unresolvedPath.value}" not found`,
          },
          error: '',
        }
      : response.value,
  );

  function syncSelectionFromLocation() {
    // A method only lives exactly one path segment deep (see the comment
    // above). A deeper path like `/ssss/sendMessage` must never resolve to
    // `sendMessage` just because it's the last segment - treat it as an
    // unmatched route (404) and show the full path, not just its tail.
    const segments = pathSegments(window.location.pathname);
    const name = segments.length === 1 ? segments[0] : segments.join('/');
    unresolvedPath.value = name;
    const method =
      segments.length === 1
        ? ((schema.value?.methods ?? []).find((candidate) => candidate.name === segments[0]) ??
          null)
        : null;
    selectMethod(method);
    if (!method && name && typeof document !== 'undefined') {
      document.title = 'Not found · Bot Studio';
      metaDescriptionEl?.setAttribute('content', `No Telegram Bot API method matches "${name}".`);
    }
  }

  // Used by the header logo/title link: same end state as landing on the bare
  // root path, but driven directly instead of re-parsing window.location (the
  // caller already pushed the new URL itself, mirroring MethodSidebar.vue).
  function goHome() {
    unresolvedPath.value = '';
    selectMethod(null);
  }

  function updateDocumentMeta(method: TelegramMethod | null) {
    if (typeof document === 'undefined') return;
    document.title = method ? `${method.name} · Bot Studio` : defaultTitle;
    if (metaDescriptionEl) {
      metaDescriptionEl.setAttribute(
        'content',
        method
          ? method.description ||
              `Build and test the Telegram Bot API "${method.name}" method with Bot Studio.`
          : defaultDescription,
      );
    }
  }

  function handlePopState() {
    // The browser has already updated location.pathname for us (back/forward
    // navigation); just resync in-memory state to match.
    syncSelectionFromLocation();
  }

  onMounted(() => {
    window.addEventListener('popstate', handlePopState);
  });

  onUnmounted(() => {
    window.removeEventListener('popstate', handlePopState);
  });

  function notify(tone: Notice['tone'], title: string, message: string) {
    const notice = { id: ++noticeId, tone, title, message };
    notices.value = [notice, ...notices.value].slice(0, 4);
    window.setTimeout(() => {
      notices.value = notices.value.filter((item) => item.id !== notice.id);
    }, 4200);
  }

  function selectMethod(method: TelegramMethod | null) {
    selected.value = method;
    values.value = defaultValues(method);
    requestJson.value = jsonForDisplay(buildPreviewPayload(method, values.value));
    requestJsonError.value = '';
    formError.value = '';
    response.value.status = 'waiting';
    response.value.payload = null;
    response.value.error = '';
    updateDocumentMeta(method);
  }

  async function loadSchema() {
    loadingSchema.value = true;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}schema/bot-api.json`, {
        cache: 'no-store',
      });
      const nextSchema = (await res.json()) as TelegramSchema;
      if (!Array.isArray(nextSchema.methods) || nextSchema.methods.length === 0)
        throw new Error('No Telegram methods found.');
      schema.value = nextSchema;
      // Deep-link support: if the page was loaded (or hard-refreshed) at
      // `/methodName`, land on that method already selected instead of
      // resetting to "no selection".
      syncSelectionFromLocation();
    } finally {
      loadingSchema.value = false;
    }
  }

  async function submit() {
    formError.value = '';
    const cleanToken = normalizeToken(token.value);
    if (!selected.value) {
      formError.value = 'Choose a method first.';
      return;
    }
    if (!cleanToken) {
      formError.value = 'Bot token is required.';
      return;
    }

    let requestPayload: Record<string, unknown>;
    try {
      requestPayload = payloadForSubmit();
    } catch (error) {
      formError.value = error instanceof Error ? error.message : 'Invalid request JSON.';
      requestJsonError.value = formError.value;
      notify('warning', 'Invalid request JSON', formError.value);
      return;
    }

    const missing = missingRequiredFromPayload(selected.value, requestPayload);
    if (missing.length) {
      formError.value = `Required parameter missing: ${missing.map((item) => item.name).join(', ')}`;
      notify('warning', 'Missing parameters', formError.value);
      return;
    }

    if (
      dangerousMethods.has(selected.value.name) &&
      !window.confirm(`${selected.value.name} can change bot or chat state. Continue?`)
    )
      return;

    response.value.status = 'loading';
    response.value.payload = null;
    response.value.error = '';

    try {
      const res = await fetch(`https://api.telegram.org/bot${cleanToken}/${selected.value.name}`, {
        method: 'POST',
        ...buildRequestInitFromPayload(requestPayload),
      });
      const text = await res.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { ok: false, description: text };
      }
      response.value.payload = payload;
      const telegramOk =
        typeof payload === 'object' &&
        payload &&
        'ok' in payload &&
        Boolean((payload as { ok?: unknown }).ok);
      response.value.status = telegramOk ? 'ok' : `HTTP ${res.status}`;
      notify(
        response.value.status === 'ok' ? 'success' : 'error',
        response.value.status === 'ok' ? 'Request succeeded' : 'Telegram returned an error',
        response.value.status,
      );
    } catch (error) {
      response.value.status = 'failed';
      response.value.error = error instanceof Error ? error.message : 'Request failed.';
      notify('error', 'Request failed', response.value.error);
    }
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    notify('success', 'Copied', `${label} copied to clipboard.`);
  }

  return {
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
    notFoundPath: unresolvedPath,
    notFoundSuggestions,
    loadSchema,
    goHome,
    selectMethod,
    submit,
    copy,
  };
}
