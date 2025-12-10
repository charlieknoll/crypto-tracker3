<template>
  <q-page>
    <transactions-table
      title="Unrealized Gains"
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
import { computed, ref, shallowRef } from "vue";
import { columns } from "src/models/unrealized"
import TransactionsTable from "src/components/TransactionsTable.vue";
import AssetFilter from "src/components/AssetFilter.vue";
import { filterByAssets, filterByYear } from "src/utils/filter-helpers";
import { useAppStore } from "src/stores/app-store";
import { useCapitalGainsStore } from "src/stores/capital-gains-store";
import {usePricesStore} from "src/stores/prices-store";


const appStore = useAppStore();
const priceStore = usePricesStore();
//array of object.(price,date,symbol)
const prices = shallowRef([]);
const capitalGainsStore = useCapitalGainsStore();
const groups = ["Detailed", "Asset Totals", "Totals"];
const gainsGrouping = ref("Asset Totals");
const getCurrentPrices = async function() {

}
const filtered = computed(() => {
  let txs = capitalGainsStore.capitalGains.unrealized

  //TODO map into long and short with gain/loss amount next long date, grouping by day



  //let txs = getCapitalGains(false).sellTxs;
  if (!txs) return [];
  txs = filterByAssets(txs, appStore.selectedAssets);
  txs.map((t) => {
    if (!prices.value.find((p) => p.asset == t.asset)) {
      const recentPrice = priceStore.getMostRecentPrice(t.asset)
      prices.value.push({
        asset: t.asset,
        price: recentPrice.price,
        timestamp: recentPrice.timestamp
      })
    }
  })

  return txs;
  // if (appStore.taxYear != "All") {
  //   txs = filterByYear(txs, appStore.taxYear);
  // }

  if (gainsGrouping.value == "Detailed") return txs;
  let totals = [];
  for (const tx of txs) {
    let total = totals.find((t) => t.asset == tx.asset && t.taxCode == tx.taxCode);
    if (!total) {
      total = {
        asset: tx.asset,
        taxCode: tx.taxCode,
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


    for (const t of totals) {
      let total = _totals.find((tx) => t.asset == tx.asset && t.taxCode == tx.taxCode);
      if (!total) {
        total = {
          taxCode: t.taxCode,
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
