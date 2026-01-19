<template>
  <router-view />
</template>

<script setup>
import { onMounted, watchEffect } from 'vue'
import { useAppStore } from './stores/app-store';
import { usePricesStore } from './stores/prices-store';
import { useExchangeTradesStore } from './stores/exchange-trades-store';

import { useSettingsStore } from './stores/settings-store';
onMounted(() => {
  const settings = useSettingsStore()
  const app = useAppStore()
  const prices = usePricesStore()
  //console.log("APP vue")
  const exchangeTrades = useExchangeTradesStore();
  settings.$subscribe((mutation, state) => {
    if (!app.importing) app.needsBackup = true
  })

  // watchEffect(async () => {
  //   const watched = exchangeTrades.records;
  //   prices.getPrices()

  // });

  window.ononline = () => (app.onLine = true);
  window.onoffline = () => (app.onLine = false);
})

</script>
