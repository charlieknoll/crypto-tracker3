<template>
  <q-page class="flex flex-center">
    <q-btn
      @click="setYear"
      label="Test" />
    <label>{{counterStore.counter}}</label>
    <q-btn-dropdown flat :label="appStore.taxYear">
      <q-list>
        <q-item
          v-for="n in appStore.taxYears"
          :key="`x.${n}`"
          clickable
          v-close-popup
          tabindex="0"
          @click="appStore.taxYear = n">
          <q-item-label>{{ n }}</q-item-label>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </q-page>
</template>

<script setup>
import { useAppStore } from 'src/stores/app-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { useCounterStore } from 'stores/example-store'
const counterStore = useCounterStore()
const appStore = useAppStore()
const settingsStore = useSettingsStore()
const setYear = () => {
  //appStore.setYear(2021)
  settingsStore.startYear = 2013
}
</script>
