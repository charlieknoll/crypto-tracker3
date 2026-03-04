<template>
  <q-page>
    <transactions-table
      title="Income"
      :rows="filtered"
      :columns="gainsGrouping == 'Detailed' ? columns : totalColumns"
      rowKey="xx">
      <template v-slot:top-right>
        <div class="row">
          <account-filter :options="accounts"></account-filter>
          <asset-filter></asset-filter>
          <q-btn-dropdown stretch flat :label="gainsGrouping">
            <q-list>
              <q-item
                v-for="n in groups"
                :key="`x.${n}`"
                clickable
                v-close-popup
                tabindex="0"
                @click="gainsGrouping = n">
                <q-item-label>{{ n }}</q-item-label>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
      </template>
    </transactions-table>
  </q-page>
</template>
<script setup>
import { computed, ref } from "vue";
import { columns, totalColumns } from "src/models/income"
import TransactionsTable from "src/components/TransactionsTable.vue";
import AssetFilter from "src/components/AssetFilter.vue";
import AccountFilter from "src/components/AccountFilter.vue";
import { filterByAssets, filterByYear, filterByAccounts } from "src/utils/filter-helpers";
import { useAppStore } from "src/stores/app-store";
import { useChainTxsStore } from "src/stores/chain-txs-store";
import { useLedgersStore } from "src/stores/ledgers-store";
import { onlyUnique } from "src/utils/array-helpers";


const appStore = useAppStore();
const chainTxsStore = useChainTxsStore();
const ledgersStore = useLedgersStore();
const groups = ["Detailed", "Asset Totals", "Totals"];
const gainsGrouping = ref("Asset Totals");
const allTxs = computed(() => {
  let txs = chainTxsStore.accountTxs
  if (!txs) return [];
  txs = txs.filter((tx) => tx.taxCode == "INCOME")
  const ledgers = ledgersStore.ledgers;
  txs = txs.concat(ledgers.filter((l) => l.action == "STAKING"));
  return txs;
});
const filtered = computed(() => {
  let txs = allTxs.value;
  txs = filterByAssets(txs, appStore.selectedAssets);
  txs = filterByAccounts(txs, appStore.selectedAccounts);
  if (appStore.taxYear != "All") {
    txs = filterByYear(txs, appStore.taxYear);
  }

  if (gainsGrouping.value == "Detailed") return txs;
  let totals = [];
  for (const tx of txs) {
    let total = totals.find((t) => t.asset == tx.asset);
    if (!total) {
      total = {
        asset: tx.asset,
        amount: 0.0,
        net: 0.0,
      };
      totals.push(total);
    }
    total.amount += parseFloat(tx.amount);
    total.net += tx.gross - tx.fee;
  }
  if (gainsGrouping.value == "Totals") {
    let _totals = [];

    let total;
    for (const t of totals) {
      if (!total) {
        total = {
          asset: `(${totals.length}) Assets`,
          net: 0.0,
        };
        _totals.push(total);
      }
      total.net += t.net;
    }
    totals = _totals;
  }
  return totals;
});
const accounts = computed(() => {
  let txs = allTxs.value;
  const allAccounts = txs.map((tx) => tx.account ?? tx.toAccountName);
  return allAccounts.filter(onlyUnique);
});
</script>
