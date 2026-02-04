<template>
  <q-page>
    <transactions-table
      title="Unrealized Gains"
      :rows="filtered"
      :columns="gainsGrouping == 'Detailed' ? columns : assetTotalColumns"
      rowKey="xx">
      <template v-slot:top-right>

        <div class="row">
          <account-filter :options="appStore.accounts"></account-filter>
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
import { columns, assetTotalColumns } from "src/models/unrealized"
import TransactionsTable from "src/components/TransactionsTable.vue";
import AssetFilter from "src/components/AssetFilter.vue";
import AccountFilter from "src/components/AccountFilter.vue";
import { filterByAssets, filterByYear, filterUpToYear, filterByAccounts } from "src/utils/filter-helpers";
import { useAppStore } from "src/stores/app-store";

import { usePricesStore } from "src/stores/prices-store";
import { useCostBasisStore } from "src/stores/cost-basis-store";
import { timestampToDateStr } from "src/utils/date-helper";
import { formatEther } from "ethers"

const appStore = useAppStore();
const priceStore = usePricesStore();
//array of object.(price,date,symbol)
const prices = shallowRef([]);
const costBasisStore = useCostBasisStore();
const groups = ["Detailed", "Asset Totals"];
const gainsGrouping = ref("Detailed");
const getCurrentPrices = async function () {

}
const filtered = computed(() => {
  let txs = costBasisStore.costBasisData.heldLots
  if (!txs) return [];
  txs = txs.filter(t => t.remainingAmount != 0n);
  txs = txs.map((t) => {
    t.date = timestampToDateStr(t.timestamp);
    return t;
  })


  //console.log(txs)
  //TODO map into long and short with gain/loss amount next long date, grouping by day

  //map new daysHeld field onto txs


  //let txs = getCapitalGains(false).sellTxs;
  if (!txs) return [];
  txs = filterByAssets(txs, appStore.selectedAssets);
  txs = filterByAccounts(txs, appStore.selectedAccounts);

  // txs.map((t) => {
  //   if (!prices.value.find((p) => p.asset == t.asset)) {
  //     const recentPrice = priceStore.getMostRecentPrice(t.asset)
  //     prices.value.push({
  //       asset: t.asset,
  //       price: recentPrice.price,
  //       timestamp: recentPrice.timestampp
  //     })
  //   }
  //   //
  // })


  if (appStore.taxYear != "All") {
    txs = filterUpToYear(txs, appStore.taxYear);
  }
  for (const tx of txs) {
    const currentPrice = priceStore.getMostRecentPrice(tx.asset);
    tx.currentPrice = currentPrice.price;
    tx.currentValue = parseFloat(formatEther(tx.remainingAmount)) * tx.currentPrice;
    tx.gainLoss = tx.currentValue - tx.remainingCostBasis;
    tx.daysHeld = Math.floor((Date.now() - tx.timestamp * 1000) / (1000 * 60 * 60 * 24));
  }
  if (gainsGrouping.value == "Detailed") return txs;

  let totals = [];
  for (const tx of txs) {
    let total = totals.find((t) => t.asset == tx.asset);
    if (!total) {
      total = {
        asset: tx.asset,
        unrealizedAmount: BigInt(0),
        costBasis: 0.0,
        price: tx.currentPrice,
        currentValue: 0.0,
        shortGain: 0.0,
        longGain: 0.0,
        gain: 0.0,
        percentGain: 0.0,
      };
      totals.push(total);
    }
    total.unrealizedAmount = total.unrealizedAmount + tx.remainingAmount;
    total.costBasis += tx.costBasis;
    total.shortGain += tx.daysHeld <= 365 ? tx.gainLoss : 0.0;
    total.longGain += tx.daysHeld > 365 ? tx.gainLoss : 0.0;
    total.gain += tx.gainLoss;
    total.currentValue += tx.currentValue;
    total.percentGain = (total.costBasis != 0.0) ? (total.gain / total.costBasis) * 100.0 : 0.0;

  }
  return totals


});

</script>
