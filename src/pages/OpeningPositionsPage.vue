<template>
  <q-page class="" id="pageOpeningPositions">
    <q-dialog v-model="editing">
      <q-card @keyup.ctrl.enter="save" style="min-width: 500px">
        <q-card-section>
          <q-banner v-if="error" inline-actions dense rounded class="text-white bg-red">
            <div class="text-caption" v-html="error"></div>
          </q-banner>
          <openingPositionForm v-model="record" v-model:error="error">
          </openingPositionForm>
        </q-card-section>
        <q-card-actions align="right" class="text-primary">

          <q-btn v-if="record.id" flat color="red" label="Delete" @click="remove" />
          <q-btn flat color="green" label="Save" @click="save" />
          <q-btn flat label="Cancel" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <transactions-table
      :title="'Opening Positions'"
      :rows="filtered"
      :columns="columns"
      @rowClick="edit">
      <template v-slot:top-right>
        <account-filter></account-filter>
        <asset-filter></asset-filter>
        <q-btn class="q-ml-lg" color="secondary" label="Add" @click="add" />
        <q-btn class="q-ml-sm" color="negative" label="Clear" @click="clear" />
      </template>
    </transactions-table>
  </q-page>
</template>
<script setup>
import { ref, reactive, computed } from "vue";
import TransactionsTable from "src/components/TransactionsTable.vue";
import AccountFilter from "src/components/AccountFilter.vue"
import AssetFilter from "src/components/AssetFilter.vue"
import { fields } from "src/models/opening-positions";
import { useColumns } from "src/use/useColumns";
import { useOpeningPositionsStore } from "src/stores/opening-positions-store";
import openingPositionForm from "components/openingPositionForm.vue";
import { useQuasar } from "quasar";

import { useAppStore } from "src/stores/app-store";
import { filterByAccounts, filterByAssets, filterByYear } from "src/utils/filter-helpers";
const store = useOpeningPositionsStore();

const columns = useColumns(fields);
const $q = useQuasar();

const error = ref("");
const editing = ref(false);
const record = reactive({});
const add = () => {
  error.value = "";
  Object.assign(record, store.initValue);
  editing.value = true;
};
const remove = () => {
  error.value = "";
  if (record.id) store.delete(record.id);
  editing.value = false;
};
const clear = () => {
  const appStore = useAppStore();
  let message = "Are you sure you want to delete all opening positions?";
  if (appStore.needsBackup) message += "  NOTE: You currently need to back up your data.";
  $q.dialog({
    title: "Confirm",
    message,
    cancel: true,
    persistent: true,
  })
    .onOk(() => {
      // console.log('>>>> OK')
      store.clear()
    })
    .onOk(() => {
      // console.log('>>>> second OK catcher')
    })
    .onCancel(() => {
      // console.log('>>>> Cancel')
    })
    .onDismiss(() => {
      // console.log('I am triggered on both OK and Cancel')
    });
};

const edit = (evt, row, index) => {
  error.value = "";
  Object.assign(record, row);
  editing.value = true;
};
const save = () => {
  error.value = store.set(record);
  editing.value = error.value != "";
  //console.log(edit.value)
};
const filtered = computed(() => {
  //return [{ id: 'test' }]
  const appStore = useAppStore()
  let txs = store.records;
  txs = filterByAssets(txs, appStore.selectedAssets);
  txs = filterByAccounts(txs, appStore.selectedAccounts);
  txs = filterByYear(txs, appStore.taxYear)
  return txs

});
</script>
