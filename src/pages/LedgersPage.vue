<template>
  <q-page>
    <q-dialog v-model="editing">
      <q-card @keyup.ctrl.enter="save">
        <q-card-section>
          <q-banner v-if="error" inline-actions dense rounded class="text-white bg-red">
            <div class="text-caption" v-html="error"></div>
          </q-banner>
          <LedgersForm v-model="record" v-model:error="error">
          </LedgersForm>
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
        <div>
          <account-filter :options="accounts"></account-filter>
          <asset-filter></asset-filter>
        </div>
        <div>
          <q-btn class="q-ml-sm" color="secondary" label="Import Kraken" @click="importKraken" />
          <q-btn class="q-ml-sm" color="secondary" label="Add" @click="add" />
          <q-btn class="q-ml-sm" color="negative" label="Clear" @click="clear" />
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
import LedgersForm from "src/components/LedgersForm.vue";
import { fields, splitFields } from "src/models/ledgers";
import { useColumns } from "src/use/useColumns";
import { useLedgersStore } from "src/stores/ledgers-store";
import { useQuasar } from "quasar";
import { useAppStore } from "src/stores/app-store";
import { filterByAccounts, filterByAssets, filterByYear } from "src/utils/filter-helpers";
import Repo from "src/utils/repo-helpers";
import { onlyUnique } from "src/utils/array-helpers";

const $q = useQuasar();
const store = useLedgersStore();
const split = ref(false);
const columns = ref(useColumns(fields));

const repo = new Repo("Ledgers", store, $q);
const { title, record, editing, error, add, edit, save, remove, clear } = repo;

const importKraken = async () => {
  try {
    const result = await store.importKrakenLedgerEntries({});
    $q.notify({
      color: "green",
      icon: "done",
      message: `Imported ${result} Kraken ledger entries.`,
    });
  } catch (err) {
    $q.notify({
      color: "negative",
      icon: "error",
      message: err.message ?? "Failed to import Kraken ledger entries.",
    });
  }
};

const filtered = computed(() => {
  const appStore = useAppStore();
  let txs = split.value ? store.sortedSplit : store.trades;
  txs = txs.map((t, index) => {
    t.rowKey = index + 1;
    return t;
  });
  txs = filterByAssets(txs, appStore.selectedAssets);
  txs = filterByAccounts(txs, appStore.selectedAccounts);
  txs = filterByYear(txs, appStore.taxYear);
  return txs;
});

const accounts = computed(() => {
  let txs = split.value ? store.sortedSplit : store.trades;
  const allAccounts = txs.map((tx) => tx.account);
  return allAccounts.filter(onlyUnique);
});

watchEffect(() => {
  columns.value = split.value ? useColumns(splitFields) : useColumns(fields);
});
</script>
