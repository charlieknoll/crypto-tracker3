<template>
  <div style="min-width: 250px; display: inline-block;">
    <base-select
      v-model="store.selectedAssets"
      :options="assets"
      label="Assets" />
  </div>
</template>
<script setup>
import { useAppStore } from 'src/stores/app-store';
import BaseSelect from "src/components/Base/BaseSelect.vue";
const store = useAppStore()
const assets = store.assets
</script>
