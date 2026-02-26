<template>
  <q-page>
    <q-banner @click="showUnreconciled" class="bg-negative text-white"
      :class="showError ? '' : 'hidden'">
      {{ errorMessage }} <br> Please review your
      transactions to ensure all buys and sells are accounted for. (Click for console log)
    </q-banner>
    <transactions-table
      title="Capital Gains"
      :rows="filtered"
      :columns="currentColumns"
      @rowClick="showBuys"
      rowKey="rowIndex">
      <template v-slot:top-right>
        <div class="row">
          <q-toggle label="Sells Only" v-model="sellsOnly" class="q-pr-sm"></q-toggle>
          <q-toggle label="Zero Prices" v-model="zeroPrices" class="q-pr-sm"></q-toggle>
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
import { assetTotalColumns, columns } from "src/models/capital-gains";
import { filterByAccounts, filterByAssets, filterByYear } from "src/utils/filter-helpers";
import { useAppStore } from "src/stores/app-store";
import { onlyUnique } from "src/utils/array-helpers";
import { timestampToDateStr } from "src/utils/date-helper";
import { useCostBasisStore } from "src/stores/cost-basis-store";
import { useQuasar } from "quasar";
import { showWarning } from "src/use/useShowWarning";
import { getLotTrace } from "src/utils/tx-history-helpers";

const appStore = useAppStore();
const costBasisStore = useCostBasisStore();
const zeroPrices = ref(false);
const sellsOnly = ref(true);
const groups = ["Detailed", "Asset Totals", "Totals"];
const gainsGrouping = ref("Detailed");
const showError = computed(() => {
  if (!costBasisStore.costBasisData) return false;
  return costBasisStore.costBasisData.unreconciledAccounts.length > 0 ||
    costBasisStore.costBasisData.noInventoryTxs.length > 0;
})
const errorMessage = computed(() => {
  if (!costBasisStore.costBasisData) return "";
  const unreconciledCount = costBasisStore.costBasisData.unreconciledAccounts.length;
  const noInventoryCount = costBasisStore.costBasisData.noInventoryTxs.length;
  let message = "";
  if (unreconciledCount > 0) {
    message += `${unreconciledCount} unreconciled transactions. `;
  }
  if (noInventoryCount > 0) {
    message += `${noInventoryCount} transactions with no inventory.`;
  }
  return message;
});
const $q = useQuasar();
const showBuys = (evt, row, index) => {
  let txs = getLotTrace(row, costBasisStore.costBasisData.heldLots);
  console.log("Buy/Sell Trace for rowIndex:", row.rowIndex);
  console.log(txs)
}
const currentColumns = computed(() => {
  if (gainsGrouping.value == "Detailed") return columns;
  return assetTotalColumns;
});
const showUnreconciled = () => {
  console.log("Unreconciled Accounts:");
  console.log(costBasisStore.costBasisData.unreconciledAccounts.map(a =>
    `Account: ${a.account}, Asset: ${a.asset}, Date/Time: ${new Date(a.timestamp * 1000).toISOString()}, timestamp:${a.timestamp}`).join("\n"));
  console.log("No Inventory Transactions:");
  console.log(costBasisStore.costBasisData.noInventoryTxs)
}
const filtered = computed(() => {
  //let txs = capitalGainsStore.capitalGains.realizedLots;
  let txs;
  try {
    txs = costBasisStore.costBasisData.soldLots;
  } catch (error) {
    showWarning($q, error.message);
  }

  if (!txs) return [];

  txs = txs.map((t, index) => {
    t.date = timestampToDateStr(t.timestamp);
    t.rowIndex = index + 1
    return t;

  })
  if (zeroPrices.value) {
    txs = txs.filter((t) => t.price == 0.0 || t.buyPrice == 0.0);
  }
  if (sellsOnly.value) {
    txs = txs.filter((t) => t.taxTxType === "SELL");
  }
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
        rowIndex: "" + ctr,
        asset: tx.asset,
        amount: BigInt(0),
        costBasis: 0.0,
        proceeds: 0.0,
        shortTermGain: 0.0,
        longTermGain: 0.0,
        shortLots: 0,
        longLots: 0,
      };
      totals.push(total);
    }
    total.amount += tx.amount;
    total.proceeds += tx.proceeds;
    total.costBasis += tx.costBasis;
    total.shortTermGain += tx.daysHeld > 365 ? 0.0 : tx.gainLoss;
    total.longTermGain += tx.daysHeld > 365 ? tx.gainLoss : 0.0;
    total.shortLots += tx.daysHeld > 365 ? 0 : 1;
    total.longLots += tx.daysHeld > 365 ? 1 : 0;
  }

  if (gainsGrouping.value == "Totals") {

    const total = {
      rowIndex: "" + ctr++,
      costBasis: 0.0,
      proceeds: 0.0,
      shortTermGain: 0.0,
      longTermGain: 0.0,


    };
    for (const t of totals) {

      total.proceeds += t.proceeds;
      total.costBasis += t.costBasis;
      total.shortTermGain += t.shortTermGain;
      total.longTermGain += t.longTermGain;

    }

    return [total];
  }
  return totals

});
</script>
