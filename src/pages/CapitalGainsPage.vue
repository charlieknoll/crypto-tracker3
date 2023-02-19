<template>
  <q-page>
    <transactions-table title="Capital Gains" :rows="filtered" :columns="columns" @rowClick="showBuys">
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
import { computed, ref } from "vue";
import TransactionsTable from "src/components/TransactionsTable.vue";
import AccountFilter from "src/components/AccountFilter.vue";
import AssetFilter from "src/components/AssetFilter.vue";
import { columns } from "src/models/capital-gains";
import { filterByAccounts, filterByAssets, filterByYear } from "src/utils/filter-helpers";
import { useAppStore } from "src/stores/app-store";
import { useCapitalGainsStore } from "src/stores/capital-gains-store";
import { getCapitalGains } from "src/stores/capital-gains-store";
import { onlyUnique } from "src/utils/array-helpers";

const appStore = useAppStore();
const capitalGainsStore = useCapitalGainsStore();

const groups = ["Detailed", "Asset Totals", "Totals"];
const gainsGrouping = ref("Detailed");
const showBuys = (evt, row, index) => {
  let txs = capitalGainsStore.capitalGains.splitTxs
  txs = txs.filter((t) => t.sellId == row.id)
  console.log(txs)
}
const filtered = computed(() => {
  let txs = capitalGainsStore.capitalGains.sellTxs;
  //let txs = getCapitalGains(false).sellTxs;
  if (!txs) return [];

  txs = filterByAssets(txs, appStore.selectedAssets);
  txs = filterByAccounts(txs, appStore.selectedAccounts);
  if (appStore.taxYear != "All") {
    txs = filterByYear(txs, appStore.taxYear)
  }

  if (gainsGrouping.value == "Detailed") return txs;
  const totals = [];
  let ctr = 0;
  for (const tx of txs) {
    let total = totals.find((t) => t.asset == tx.asset);
    if (!total) {
      ctr++;
      total = {
        id: "" + ctr,
        asset: tx.asset,
        amount: 0.0,
        fee: 0.0,
        gross: 0.0,
        proceeds: 0.0,
        shortTermGain: 0.0,
        longTermGain: 0.0,
        shortLots: 0,
        longLots: 0,
      };
      totals.push(total);
    }
    total.amount += tx.amount;
    total.fee += tx.fee;
    total.gross += tx.gross;
    total.proceeds += tx.proceeds;
    total.shortTermGain += tx.shortTermGain;
    total.longTermGain += tx.longTermGain;
    total.shortLots += tx.shortLots;
    total.longLots += tx.longLots;
  }
  if (gainsGrouping.value == "Totals") {

    const total = {
      id: "" + ctr++,
      fee: 0.0,
      gross: 0.0,
      proceeds: 0.0,
      shortTermGain: 0.0,
      longTermGain: 0.0,

    };
    for (const t of totals) {
      total.fee += t.fee;
      total.gross += t.gross;
      total.proceeds += t.proceeds;
      total.shortTermGain += t.shortTermGain;
      total.longTermGain += t.longTermGain;

    }
    totals.length = 0;
    totals.push(total);
  }
  return totals;

});
</script>
