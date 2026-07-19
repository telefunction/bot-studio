<script setup lang="ts">
import ParameterInput from '@/components/ParameterInput.vue';
import type { ParamValue, TelegramMethod, TelegramSchema } from '@/types/schema';

defineProps<{ method: TelegramMethod | null; schema: TelegramSchema | null }>();
const values = defineModel<Record<string, ParamValue>>({ required: true });
</script>

<template>
  <div v-if="!method" class="empty-pane">
    Choose a Telegram Bot API method from the list to generate its parameter form.
  </div>
  <div v-else-if="method.parameters.length === 0" class="empty-pane">
    This method has no parameters. Add a token and run it.
  </div>
  <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <ParameterInput
      v-for="parameter in method.parameters"
      :key="parameter.name"
      v-model="values[parameter.name]"
      :parameter="parameter"
      :schema="schema"
    />
  </div>
</template>
