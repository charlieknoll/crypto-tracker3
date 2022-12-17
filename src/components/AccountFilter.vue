<template>
  <div style="min-width: 250px; display: inline-block;">
    <base-select

      v-model="store.selectedAccounts"
      :options="options ?? accounts"
      label="Accounts" />
  </div>
</template>
<script setup>
import { useAppStore } from "src/stores/app-store";
import BaseSelect from "src/components/Base/BaseSelect.vue";

const store = useAppStore();
const accounts = store.accounts;

const props = defineProps({
  options: {
    type: [Array],
    default: () => [],
  },
});
</script>
