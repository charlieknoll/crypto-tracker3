<template>
  <q-page>
    <transactions-table
      title="Income"
      :rows="filtered"
      :columns="columns"
      rowKey="xx">
      <template v-slot:top-right>
        <div class="row">
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
import { columns } from "src/models/income"
import TransactionsTable from "src/components/TransactionsTable.vue";
import AssetFilter from "src/components/AssetFilter.vue";
import { filterByAssets, filterByYear } from "src/utils/filter-helpers";
import { useAppStore } from "src/stores/app-store";
import { useChainTxsStore } from "src/stores/chain-txs-store";


const appStore = useAppStore();
const chainTxsStore = useChainTxsStore();
const groups = ["Detailed", "Asset Totals", "Totals"];
const gainsGrouping = ref("Asset Totals");
const filtered = computed(() => {
  let txs = chainTxsStore.accountTxs

  //let txs = getCapitalGains(false).sellTxs;
  if (!txs) return [];
  txs = txs.filter((tx) => tx.taxCode == "INCOME")
  txs = filterByAssets(txs, appStore.selectedAssets);

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
        gross: 0.0,
      };
      totals.push(total);
    }
    total.amount += tx.amount;
    total.gross += tx.gross;
  }
  if (gainsGrouping.value == "Totals") {
    let _totals = [];

    let total;
    for (const t of totals) {
      if (!total) {
        total = {
          asset: `(${totals.length}) Assets`,
          amount: 0.0,
          gross: 0.0,
        };
        _totals.push(total);
      }
      total.amount += t.amount;
      total.gross += t.gross;
    }
    totals = _totals;
  }
  return totals;
});

</script>
