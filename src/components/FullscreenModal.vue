<script setup lang="ts">
import AppModal from '@/components/AppModal.vue';
defineProps<{ title: string }>();
const open = defineModel<boolean>('open', { required: true });
</script>

<template>
  <AppModal v-model:open="open" :title="title" size="fullscreen">
    <template #actions><slot name="actions" /></template>
    <slot />
  </AppModal>
</template>
