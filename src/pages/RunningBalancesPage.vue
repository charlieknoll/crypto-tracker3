<template>
  <q-page>
    <transactions-table title="Running Balances" :rows="filtered" :columns="columns" @rowClick="showDelta">
      <template v-slot:top-right>
        <div class="row">
          <account-filter :options="accounts"></account-filter>
          <asset-filter></asset-filter>

          <q-btn-dropdown stretch flat :label="balanceGrouping">
            <q-list>
              <q-item
                v-for="n in groups"
                :key="`x.${n}`"
                clickable
                v-close-popup
                tabindex="0"
                @click="balanceGrouping = n">
                <q-item-label>{{ n }}</q-item-label>
              </q-item>
            </q-list>
          </q-btn-dropdown>

          <q-btn class="q-ml-lg" color="primary" label="Reconcile" />
        </div>
      </template>
    </transactions-table>
  </q-page>
</template>
<script setup>
import { computed, ref } from "vue";
import TransactionsTable from "src/components/TransactionsTable.vue";
import AccountFilter from "src/components/AccountFilter.vue";
import AssetFilter from "src/components/AssetFilter.vue";
import { columns } from "src/models/running-balances";
import { filterByAccounts, filterByAssets, filterByYear } from "src/utils/filter-helpers";
import { useAppStore } from "src/stores/app-store";
import { useRunningBalancesStore } from "src/stores/running-balances-store";
import { onlyUnique } from "src/utils/array-helpers";
const showDelta = (evt, row, index) => {
  if (!row.delta) console.log(row)

  console.log("Delta: " + row.delta);
}
const appStore = useAppStore();
const runningBalancesStore = useRunningBalancesStore();

const groups = ["Detailed", "Account", "Asset"]
const balanceGrouping = ref("Account");
const filtered = computed(() => {
  let txs = runningBalancesStore.runningBalances;
  if (!txs) return []
  let taxYear = appStore.taxYear;
  txs = filterByAssets(txs, appStore.selectedAssets);
  txs = filterByAccounts(txs, appStore.selectedAccounts);
  if (taxYear == "All") {
    taxYear = appStore.taxYears[appStore.taxYears.length - 2];
  }

  if (balanceGrouping.value == "Account") {
    txs = txs.filter((tx) => {
      return tx.accountEndingYears.findIndex((ey) => ey == taxYear) > -1;
    });

  }
  if (balanceGrouping.value == "Asset") {

    txs = txs.filter((tx) => {
      return tx.assetEndingYears.findIndex((ey) => ey == taxYear) > -1;
    });


  }


  txs = filterByYear(txs, appStore.taxYear);

  return txs;
});
const accounts = computed(() => {
  //const runningBalancesStore = useRunningBalancesStore();
  let txs = runningBalancesStore.runningBalances;
  if (!txs) return
  txs = filterByAssets(txs, appStore.selectedAssets);
  txs = filterByYear(txs, appStore.taxYear);
  const allAccounts = txs.map((tx) => tx.account);
  const result = allAccounts.filter(onlyUnique).sort((a, b) => a.toUpperCase() > b.toUpperCase() ? 1 : -1);
  return result
});
</script>
