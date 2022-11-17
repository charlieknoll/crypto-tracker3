<template>
  <router-view />
</template>

<script setup>
import { defineComponent, onMounted } from 'vue'
import { useAppStore } from './stores/app-store';
import { useSettingsStore } from './stores/settings-store';
onMounted(() => {
  const settings = useSettingsStore()
  const app = useAppStore()
  settings.$subscribe((mutation, state) => {
    if (!app.importing) app.needsBackup = true
  })

  window.ononline = () => (app.onLine = true);
  window.onoffline = () => (app.onLine = false);
})

</script>
