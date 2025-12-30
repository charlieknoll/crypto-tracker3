<template>
  <q-page class="constrain q-pa-md" id="pageBackup">
    <div class="q-table__title">Help</div>
    <q-form class="q-gutter-md q-pa-lg">
      <div>
        <div v-html="markdownContent" />
      </div>
    </q-form>
  </q-page>
</template>

<script setup>
import { h, ref } from 'vue';
import { marked } from 'marked';
import taxTreatmentContent from '../markdown/tax-treatment.md?raw';
import helpContent from '../markdown/help.md?raw';

const markdownContent = ref(marked(helpContent));
</script>

<style scoped>
/* Add any specific styles here */
</style>
