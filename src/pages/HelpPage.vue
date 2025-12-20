<template>
  <q-page class="constrain q-pa-md" id="pageBackup">
    <div class="q-table__title">Help</div>
    <q-form class="q-gutter-md q-pa-lg">
      <div>
        <h1>Tax Treatment Information</h1>
        <div v-html="markdownContent" />
      </div>
    </q-form>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import { marked } from 'marked';
import taxTreatmentContent from '../markdown/tax-treatment.md?raw';

const markdownContent = ref(marked(taxTreatmentContent));
</script>

<style scoped>
/* Add any specific styles here */
</style>
