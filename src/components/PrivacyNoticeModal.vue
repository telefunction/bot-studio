<script setup lang="ts">
import { Lock, ShieldCheck, ShieldOff } from '@lucide/vue';
import AppModal from '@/components/AppModal.vue';
import { PRIVACY_NOTICE_COOKIE, setCookie } from '@/lib/cookies';
const open = defineModel<boolean>('open', { required: true });
function dismiss() {
  setCookie(PRIVACY_NOTICE_COOKIE, '1', 400);
  open.value = false;
}
</script>
<template>
  <AppModal
    v-model:open="open"
    title="Your data stays yours"
    eyebrow="Privacy & security"
    size="compact"
    @close="dismiss"
  >
    <template #icon><ShieldCheck class="h-5 w-5" /></template>
    <div class="space-y-5 text-sm leading-6">
      <p class="text-ink-950 dark:text-paper-50">
        Bot Studio has <span class="font-black">no backend</span>. There is no server operated by
        this project sitting between you and Telegram — every request you build here is sent
        <span class="font-black">directly from your browser to Telegram's own servers</span>.
      </p>

      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <div
            class="border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan dark:border-signal-cyan/25 dark:bg-signal-cyan/15 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border"
          >
            <ShieldOff class="h-4 w-4" />
          </div>
          <p class="text-ink-700 dark:text-paper-300">
            Nobody else can see, log, or intercept your bot token — there's simply no server in the
            middle to do so.
          </p>
        </div>
        <div class="flex items-start gap-3">
          <div
            class="border-signal-blueBright/30 bg-signal-blueBright/10 text-signal-blueBright dark:border-signal-blueBright/25 dark:bg-signal-blueBright/15 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border"
          >
            <Lock class="h-4 w-4" />
          </div>
          <p class="text-ink-700 dark:text-paper-300">
            Your token lives only in this browser tab's memory for the current session — it's never
            written to disk or transmitted anywhere except straight to Telegram's API.
          </p>
        </div>
      </div>

      <p class="text-ink-700 dark:text-paper-300">
        The whole app runs client-side and fully decentralized. Bot Studio itself doesn't collect,
        store, or transmit anything you enter to any third party.
      </p>
    </div>
    <template #footer
      ><button type="button" class="modal-primary ml-auto" @click="dismiss">
        <ShieldCheck class="h-4 w-4" /> Got it, understood
      </button></template
    >
  </AppModal>
</template>
