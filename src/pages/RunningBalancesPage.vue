<template>
  <q-page>
    <transactions-table title="Running Balances" :rows="filtered" :columns="columns">
      <template v-slot:top-right>
        <div class="row">
          <account-filter :options="accounts"></account-filter>
          <asset-filter></asset-filter>
        </div>
      </template>
    </transactions-table>
  </q-page>
</template>
<script setup>
import { computed } from "vue";
import TransactionsTable from "src/components/TransactionsTable.vue";
import AccountFilter from "src/components/AccountFilter.vue";
import AssetFilter from "src/components/AssetFilter.vue";
import { getRunningBalances, columns } from "src/services/running-balances-provider";
import { filterByAccounts, filterByAssets, filterByYear } from "src/utils/filter-helpers";
import { useAppStore } from "src/stores/app-store";
import { onlyUnique } from "src/utils/array-helpers";

const appStore = useAppStore();
const filtered = computed(() => {
  let txs = getRunningBalances();
  txs = filterByAssets(txs, appStore.selectedAssets);
  txs = filterByAccounts(txs, appStore.selectedAccounts);
  txs = filterByYear(txs, appStore.taxYear);

  return txs;
});
const accounts = computed(() => {
  let txs = getRunningBalances();
  txs = filterByAssets(txs, appStore.selectedAssets);
  txs = filterByYear(txs, appStore.taxYear);
  const allAccounts = txs.map((tx) => tx.account);
  return allAccounts.filter(onlyUnique);
});
</script>
