<template>
  <q-header elevated>
    <q-toolbar>
      <q-btn
        flat
        dense
        round
        icon="menu"
        aria-label="Menu"
        @click="leftDrawerOpen = !leftDrawerOpen" />

      <q-toolbar-title>
        {{ appName }}
      </q-toolbar-title>

      <q-spinner
        color="white"
        size="3em"
        :class="[appStore.importing ? '' : 'hidden']" />
      <div :class="[appStore.importing ? '' : 'hidden']">{{ appStore.importingMessage }}</div>
      <q-btn-dropdown stretch flat :label="appStore.taxYear">
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
      <div>v{{ version }}</div>
    </q-toolbar>
  </q-header>

  <q-drawer
    v-model="leftDrawerOpen"
    show-if-above
    bordered
    content-class="bg-grey-1">
    <q-list dense="">
      <template v-for="(menuItem, index) in menuList" :key="index">

        <q-item

          :to="menuItem.to"
          :active="menuItem.to === $route.path"
          active-class="bg-blue-3 text-grey-10"
          clickable
          exact
          v-ripple>
          <q-item-section avatar>
            <q-icon
              :style="menuItem.icon == 'mdi-alert' && appStore.needsBackup
                ? 'color: red;'
                : ''
                "
              :name="menuItem.icon" />
          </q-item-section>
          <q-item-section>
            {{ menuItem.label }}
          </q-item-section>
        </q-item>
        <q-separator :key="'sep' + index" v-if="menuItem.separator" />
      </template>
      <q-item>
        <q-file v-model="files" label="Import .csv/json" filled multiple />
      </q-item>
    </q-list>
  </q-drawer>

</template>

<script setup>
import { ref } from 'vue'
import { useAppStore } from 'stores/app-store'
import menuList from './menu-list'
import { useImportFiles } from 'src/use/useImportFiles';



const leftDrawerOpen = ref(false)
const appStore = useAppStore()
const version = process.env.VERSION
const appName = process.env.appName
const files = ref()

useImportFiles(files)


</script>
<style>
.q-list--dense>.q-item,
.q-item--dense {
  min-height: 32px;
  padding: 6px 16px;
}
</style>
