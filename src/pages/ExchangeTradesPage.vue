<template>
  <q-page>
    <q-dialog v-model="editing">
      <q-card @keyup.ctrl.enter="save">
        <q-card-section>
          <q-banner v-if="error" inline-actions dense rounded class="text-white bg-red">
            <div class="text-caption" v-html="error"></div>
          </q-banner>
          <exchangeTradesForm v-model="record" v-model:error="error">
          </exchangeTradesForm>
        </q-card-section>
        <q-card-actions align="right" class="text-primary">
          <q-btn v-if="record.id" flat color="red" label="Delete" @click="remove" />
          <q-btn flat color="green" label="Save" @click="save" />
          <q-btn flat label="Cancel" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <transactions-table

      :title="'Exchange Trades'"
      :rows="filtered"
      :columns="columns"
      @rowClick="edit">
      <template v-slot:top-right>
        <q-toggle label="Split" v-model="split" class="q-pr-sm"></q-toggle>
        <div>
          <account-filter></account-filter>
          <asset-filter></asset-filter>
        </div>
        <div>
          <q-btn class="q-ml-sm" color="secondary" label="Add" @click="add" />
          <q-btn class="q-ml-sm" color="negative" label="Clear" @click="clear" />
        </div>
      </template>
    </transactions-table>
  </q-page>
</template>
<script setup>
import { ref, reactive, computed, watchEffect } from "vue";
import TransactionsTable from "src/components/TransactionsTable.vue";
import AccountFilter from "src/components/AccountFilter.vue";
import AssetFilter from "src/components/AssetFilter.vue";
import { fields, splitFields } from "src/models/exchange-trades";
import { useColumns } from "src/use/useColumns";
import { useExchangeTradesStore } from "src/stores/exchange-trades-store";
import exchangeTradesForm from "components/exchangeTradesForm.vue";
import { useQuasar } from "quasar";

import { useAppStore } from "src/stores/app-store";
import { filterByAccounts, filterByAssets, filterByYear } from "src/utils/filter-helpers";

const store = useExchangeTradesStore();

const columns = ref(useColumns(fields));

const $q = useQuasar();
const split = ref(false)
const error = ref("");
const editing = ref(false);
const record = reactive({});
const add = () => {
  error.value = "";
  Object.assign(record, {})
  Object.assign(record, store.initValue);
  editing.value = true;
};
const remove = () => {
  $q.dialog({
    title: "Confirm",
    message: "Are you sure you want to delete this record?",
    cancel: true,
    persistent: true,
  }).onOk(() => {
    error.value = "";
    store.delete(record.sourceId ?? record.id);
    editing.value = false;
  })
};
const clear = () => {
  const appStore = useAppStore();
  let message = "Are you sure you want to delete all exchange trades?";
  if (appStore.needsBackup) message += "  NOTE: You currently need to back up your data.";
  $q.dialog({
    title: "Confirm",
    message,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    store.clear();
  });
};

const edit = (evt, row, index) => {
  error.value = "";
  Object.assign(record, {});
  if (row.sourceId) {
    const rec = store.records.find(r => r.id === row.sourceId)
    Object.assign(record, rec);
  } else {
    Object.assign(record, row);
  }
  editing.value = true;
};
const save = () => {
  error.value = store.set(record);
  editing.value = error.value != "";
};
const filtered = computed(() => {
  //return [{ id: 'test' }]
  const appStore = useAppStore();
  let txs = split.value ? store.split : store.records;
  //console.log(txs.length)
  txs = filterByAssets(txs, appStore.selectedAssets);
  txs = filterByAccounts(txs, appStore.selectedAccounts);
  txs = filterByYear(txs, appStore.taxYear)
  return txs;
});

watchEffect(() => {
  columns.value = (split.value) ? useColumns(splitFields) : useColumns(fields)
})
</script>
