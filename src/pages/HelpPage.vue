<template>
  <q-page class="constrain q-pa-md" id="pageHelp">
    <div class="text-h4 q-mb-lg text-weight-bold page-title">
      <q-icon name="help_outline" size="sm" class="q-mr-sm" />
      Help
      <q-space />
      <q-btn
        flat
        dense
        icon="open_in_new"
        label="Pop Out"
        size="sm"
        color="primary"
        @click="openPopout" />
    </div>

    <q-card flat bordered class="markdown-card q-mb-md">
      <q-card-section>
        <div class="markdown-body" v-html="markdownContent" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import { marked } from 'marked';
import taxTreatmentContent from '../markdown/tax-treatment.md?raw';
import helpContent from '../markdown/help.md?raw';

const markdownContent = ref(marked(helpContent));

function openPopout() {
  const win = window.open('', '_blank', 'width=700,height=800,menubar=no,toolbar=no,location=no,status=no');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Help</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      max-width: 640px;
      margin: 2rem auto;
      padding: 0 1.5rem;
      color: #333;
      line-height: 1.6;
    }
    h1, h2, h3, h4, h5, h6 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 1.5rem 0 0.4rem;
      padding-bottom: 0.3rem;
      border-bottom: 1px solid #e0e0e0;
      color: #1976d2;
    }
    h2, h3, h4, h5, h6 {
      font-size: 0.95rem;
      border-bottom: none;
      padding-bottom: 0;
      margin: 0.75rem 0 0.3rem;
    }
    ul { padding-left: 1.5rem; }
    li { margin-bottom: 0.4rem; }
    li::marker { color: #1976d2; }
    p { margin: 0.5rem 0; line-height: 1.6; }
    code {
      background: #f5f5f5;
      padding: 0.15em 0.4em;
      border-radius: 4px;
      font-size: 0.9em;
    }
  </style>
</head>
<body>${markdownContent.value}</body>
</html>`);
  win.document.close();
}
</script>

<style scoped>
.page-title {
  display: flex;
  align-items: center;
  color: var(--q-primary);
}

.markdown-card {
  border-radius: 8px;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  margin: 1rem 0 0.4rem 0 !important;
  padding: 0 0 0.3rem 0 !important;
  line-height: 1.4 !important;
  border-bottom: 1px solid rgba(128, 128, 128, 0.25);
  color: var(--q-primary) !important;
  letter-spacing: 0.02em;
}

.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  font-size: 0.95rem !important;
  border-bottom: none;
  padding-bottom: 0 !important;
  margin: 0.75rem 0 0.3rem 0 !important;
}

.markdown-body :deep(h1:first-child),
.markdown-body :deep(h2:first-child),
.markdown-body :deep(h3:first-child),
.markdown-body :deep(h4:first-child),
.markdown-body :deep(h5:first-child),
.markdown-body :deep(h6:first-child) {
  margin-top: 0 !important;
}

.markdown-body :deep(ul) {
  padding-left: 1.5rem !important;
  margin: 0.25rem 0 1rem 0 !important;
  list-style: disc !important;
}

.markdown-body :deep(li) {
  margin-bottom: 0.5rem;
  line-height: 1.6;
  display: list-item !important;
}

.markdown-body :deep(li::marker) {
  color: var(--q-primary);
}

.markdown-body :deep(code) {
  background: rgba(128, 128, 128, 0.15);
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
}

.markdown-body :deep(p) {
  margin: 0.5rem 0;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.87) !important;
}
</style>
