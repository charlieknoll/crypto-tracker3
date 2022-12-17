<template>
  <q-page>
    <q-dialog v-model="editing">
      <q-card @keyup.ctrl.enter="save">
        <q-card-section>
          <q-banner v-if="error" inline-actions dense rounded class="text-white bg-red">
            <div class="text-caption" v-html="error"></div>
          </q-banner>
          <OffchainTransfersForm v-model="record" v-model:error="error">
          </OffchainTransfersForm>
        </q-card-section>
        <q-card-actions align="right" class="text-primary">
          <q-btn v-if="record.id" flat color="red" label="Delete" @click="remove" />
          <q-btn flat color="green" label="Save" @click="save" />
          <q-btn flat label="Cancel" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <transactions-table
      :title="title"
      :rows="filtered"
      :columns="columns"
      @rowClick="edit">
      <template v-slot:top-right>
        <q-toggle label="Split" v-model="split" class="q-pr-sm"></q-toggle>
        <div class="row">
          <div>
            <account-filter></account-filter>
            <asset-filter></asset-filter>
          </div>
          <div>
            <q-btn class="q-ml-lg" color="secondary" label="Add" @click="add" />
            <q-btn class="q-ml-sm" color="negative" label="Clear" @click="clear" />
          </div>
        </div>
      </template>
    </transactions-table>
  </q-page>
</template>
<script setup>
import { ref, computed, watchEffect } from "vue";
import TransactionsTable from "src/components/TransactionsTable.vue";
import AccountFilter from "src/components/AccountFilter.vue";
import AssetFilter from "src/components/AssetFilter.vue";
import { fields, splitFields } from "src/models/offchain-transfers";
import { useColumns } from "src/use/useColumns";

import { useQuasar } from "quasar";

import { useAppStore } from "src/stores/app-store";
import { filterByAccounts, filterByAssets, filterByYear } from "src/utils/filter-helpers";
import OffchainTransfersForm from "src/components/OffchainTransfersForm.vue";
import { useOffchainTransfersStore } from "src/stores/offchain-transfers-store";

import Repo from "src/utils/repo-helpers";
const store = useOffchainTransfersStore();

const columns = ref(useColumns(fields));

const $q = useQuasar();
const split = ref(false)

const repo = new Repo("Offchain Transfers", store, $q)

const { title, record, editing, error, add, edit, save, remove, clear } = repo


const filtered = computed(() => {
  //return [{ id: 'test' }]
  const appStore = useAppStore();
  let txs = split.value ? store.split : store.records;
  txs = filterByAssets(txs, appStore.selectedAssets);
  txs = filterByAccounts(txs, appStore.selectedAccounts, true);
  txs = filterByYear(txs, appStore.taxYear)
  return txs;
});

watchEffect(() => {
  columns.value = (split.value) ? useColumns(splitFields) : useColumns(fields)
})
</script>
