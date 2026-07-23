<script setup lang="ts">
import { nextTick, useId, useTemplateRef, watch } from 'vue';
import { Lock, ShieldCheck, ShieldOff, X } from 'lucide-vue-next';
import { useFocusTrap } from '@/composables/useFocusTrap';
import { PRIVACY_NOTICE_COOKIE, setCookie } from '@/lib/cookies';

const open = defineModel<boolean>('open', { required: true });

const dialogRef = useTemplateRef<HTMLElement>('dialogRef');
const titleId = useId();

watch(open, (isOpen) => {
  if (!isOpen) return;
  nextTick(() => dialogRef.value?.focus());
});

// Every path out of this modal counts as a permanent "seen it" — a separate button elsewhere in
// the header lets the visitor reopen this notice manually any time, so there's no soft-dismiss
// state to distinguish here.
function dismiss() {
  setCookie(PRIVACY_NOTICE_COOKIE, '1', 400);
  open.value = false;
}

const { onKeydown } = useFocusTrap(dialogRef, dismiss);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-pop">
      <div v-if="open" class="fixed inset-0 z-50 overflow-y-auto p-4" role="presentation">
        <div
          class="fixed inset-0 bg-ink-950/50 backdrop-blur-sm dark:bg-black/70"
          @click="dismiss"
        />
        <div class="relative flex min-h-full items-center justify-center">
          <div
            ref="dialogRef"
            class="panel relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            tabindex="-1"
            @keydown="onKeydown"
          >
            <!-- "Seal" identity: a centered badge with concentric rings, like a wax seal or a
            verified-document stamp, marking this as a trust surface — deliberately unlike the
            Builder modal's always-dark editor-toolbar header, since this isn't a tool, it's a
            reassurance. -->
            <button
              type="button"
              class="icon-button absolute right-4 top-4 z-10"
              title="Close"
              aria-label="Close"
              @click="dismiss"
            >
              <X class="h-4 w-4" />
            </button>

            <div class="relative shrink-0 overflow-hidden px-6 pb-5 pt-8 text-center">
              <div
                class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-signal-lime/10 to-transparent dark:from-signal-lime/[0.08]"
              />
              <div class="relative mx-auto flex h-16 w-16 items-center justify-center">
                <span class="absolute inset-0 rounded-full border-2 border-signal-lime/20" />
                <span class="absolute inset-2 rounded-full border border-signal-lime/35" />
                <div
                  class="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-signal-lime to-signal-cyan text-ink-950 shadow-soft dark:shadow-darkSoft"
                >
                  <ShieldCheck class="h-5 w-5" />
                </div>
              </div>
              <h3 :id="titleId" class="relative mt-3 text-lg font-black">Your data stays yours</h3>
            </div>

            <div
              class="min-h-0 flex-1 space-y-4 overflow-y-auto border-t border-ink-950/[0.08] px-6 py-5 text-sm leading-6 dark:border-paper-50/[0.08]"
            >
              <p class="text-ink-950 dark:text-paper-50">
                Bot Studio has <span class="font-black">no backend</span>. There is no server
                operated by this project sitting between you and Telegram — every request you build
                here is sent
                <span class="font-black">directly from your browser to Telegram's own servers</span
                >.
              </p>

              <div class="space-y-3">
                <div class="flex items-start gap-3">
                  <div
                    class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan dark:border-signal-cyan/25 dark:bg-signal-cyan/15"
                  >
                    <ShieldOff class="h-4 w-4" />
                  </div>
                  <p class="text-ink-700 dark:text-paper-300">
                    Nobody else can see, log, or intercept your bot token — there's simply no server
                    in the middle to do so.
                  </p>
                </div>
                <div class="flex items-start gap-3">
                  <div
                    class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-signal-blueBright/30 bg-signal-blueBright/10 text-signal-blueBright dark:border-signal-blueBright/25 dark:bg-signal-blueBright/15"
                  >
                    <Lock class="h-4 w-4" />
                  </div>
                  <p class="text-ink-700 dark:text-paper-300">
                    Your token lives only in this browser tab's memory for the current session —
                    it's never written to disk or transmitted anywhere except straight to Telegram's
                    API.
                  </p>
                </div>
              </div>

              <p class="text-ink-700 dark:text-paper-300">
                The whole app runs client-side and fully decentralized. Bot Studio itself doesn't
                collect, store, or transmit anything you enter to any third party.
              </p>
            </div>

            <div
              class="flex shrink-0 items-center justify-end gap-3 border-t border-ink-950/[0.08] bg-paper-100/60 px-6 py-4 dark:border-paper-50/[0.08] dark:bg-navy-900/40"
            >
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border border-signal-lime bg-signal-lime px-4 py-2 text-sm font-black text-ink-950 transition hover:-translate-y-0.5 hover:brightness-95"
                @click="dismiss"
              >
                <ShieldCheck class="h-4 w-4" /> Got it, understood
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
