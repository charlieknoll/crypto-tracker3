<template>
  <q-page>
    <transactions-table
      title="Tax Export"
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
          <q-btn class="q-ml-lg" color="primary" label="8949" @click="export8949" />
        </div>
      </template>
    </transactions-table>
  </q-page>
</template>
<script setup>
import { computed, ref } from "vue";
import { useQuasar, exportFile } from 'quasar'
import TransactionsTable from "src/components/TransactionsTable.vue";
import AssetFilter from "src/components/AssetFilter.vue";
import { filterByAssets, filterByYear } from "src/utils/filter-helpers";
import { useAppStore } from "src/stores/app-store";
import { useCapitalGainsStore } from "src/stores/capital-gains-store";
import { columns, generate8949 } from "../services/tax-export-provider";

const appStore = useAppStore();
const capitalGainsStore = useCapitalGainsStore();
const $q = useQuasar()

const groups = ["Detailed", "Asset Totals", "Long/Short Totals"];
const gainsGrouping = ref("Detailed");
const filtered = computed(() => {
  let txs = capitalGainsStore.capitalGains.splitTxs;
  //let txs = getCapitalGains(false).sellTxs;
  if (!txs) return [];

  txs = filterByAssets(txs, appStore.selectedAssets);

  if (appStore.taxYear != "All") {
    txs = filterByYear(txs, appStore.taxYear);
  }

  if (gainsGrouping.value == "Detailed") return txs;
  let totals = [];
  for (const tx of txs) {
    let total = totals.find((t) => t.asset == tx.asset && t.longShort == tx.longShort);
    if (!total) {
      total = {
        asset: tx.asset,
        longShort: tx.longShort,
        amount: 0.0,
        proceeds: 0.0,
        costBasis: 0.0,
        gainOrLoss: 0.0,
        washSaleAdj: 0.0,
      };
      totals.push(total);
    }
    total.amount += tx.amount;
    total.costBasis += tx.costBasis;
    total.gainOrLoss += tx.gainOrLoss;
    total.proceeds += tx.proceeds;
    total.washSaleAdj += tx.washSaleAdj;
  }
  if (gainsGrouping.value == "Long/Short Totals") {
    let _totals = [];

    for (const t of totals) {
      let total = _totals.find((ts) => ts.longShort == t.longShort);
      if (!total) {
        total = {
          asset: `Assets (${t.longShort})`,
          longShort: t.longShort,
          proceeds: 0.0,
          costBasis: 0.0,
          gainOrLoss: 0.0,
          washSaleAdj: 0.0,
        };
        _totals.push(total);
      }
      total.costBasis += t.costBasis;
      total.gainOrLoss += t.gainOrLoss;
      total.proceeds += t.proceeds;
      total.washSaleAdj += t.washSaleAdj;
    }
    totals = _totals;
  }
  return totals;
});
const export8949 = function () {
  gainsGrouping.value = "Detailed";
  const content = generate8949(filtered.value);
  const status = exportFile("8949-" + appStore.taxYear + ".csv", content, "text/csv");
  if (status !== true) {
    $q.notify({
      message: "Browser denied file download...",
      color: "negative",
      icon: "warning",
    });
  }
};
</script>
