<template>
  <q-page>
    <q-dialog v-model="editing">
      <q-card @keyup.ctrl.enter="save">
        <q-card-section>
          <q-banner v-if="error" inline-actions dense rounded class="text-white bg-red">
            <div class="text-caption" v-html="error"></div>
          </q-banner>
          <prices-form v-model="record" v-model:error="error">
          </prices-form>
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
        <asset-filter></asset-filter>
        <q-btn class="q-ml-lg" color="primary" label="Refresh" @click="store.getPrices" />
        <q-btn class="q-ml-lg" color="secondary" label="Add" @click="add" />
        <q-btn class="q-ml-sm" color="negative" label="Clear" @click="clear(filtered)" />
      </template>
    </transactions-table>
  </q-page>
</template>
<script setup>
import { computed } from "vue";
import TransactionsTable from "src/components/TransactionsTable.vue";
import AssetFilter from "src/components/AssetFilter.vue";
import { fields } from "src/models/price";
import { useColumns } from "src/use/useColumns";

import { useQuasar } from "quasar";

import { useAppStore } from "src/stores/app-store";
import { filterByAssets, filterByYear } from "src/utils/filter-helpers";
import PricesForm from "src/components/PricesForm.vue";
import { usePricesStore } from "src/stores/prices-store";
import Repo from "src/utils/repo-helpers";

const store = usePricesStore();
const $q = useQuasar();
const repo = new Repo("Prices", store, $q)

const { title, record, editing, error, add, edit, save, remove, clear } = repo

const columns = useColumns(fields);

const filtered = computed(() => {
  //return [{ id: 'test' }]
  const appStore = useAppStore();
  let txs = store.records;
  txs = filterByAssets(txs, appStore.selectedAssets);
  txs = filterByYear(txs, appStore.taxYear);
  return txs;
});
</script>
