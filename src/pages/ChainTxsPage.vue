<template>
  <q-page>
    <transactions-table
      title="Chain Transactions"
      :rows="filtered"
      :columns="columns"
      @rowClick="view">
      <template v-slot:top-right>
        <div>
          <account-filter></account-filter>

        </div>
        <div>
          <q-btn class="q-ml-sm" color="primary" label="Import" @click="store.import" />
          <q-btn class="q-ml-sm" color="negative" label="Clear" @click="clear" />
        </div>
      </template>
    </transactions-table>
  </q-page>
</template>
<script setup>
import { ref, computed } from "vue";
import TransactionsTable from "src/components/TransactionsTable.vue";
import AccountFilter from "src/components/AccountFilter.vue";
import { fields } from "src/models/chain-tx";
import { useColumns } from "src/use/useColumns";
import { useAppStore } from "src/stores/app-store";
import { filterByAccounts, filterByYear } from "src/utils/filter-helpers";

import { useChainTxsStore } from "src/stores/chain-txs-store";
import { useAddressStore } from "src/stores/address-store";
import { useQuasar } from "quasar";


const store = useChainTxsStore();
const $q = useQuasar()

const onlyUnnamed = ref(false)

const columns = ref(useColumns(fields));

const view = function () {

}
const clear = function () {
  const appStore = useAppStore();
  let message = `Are you sure you want to delete all chain transactions?`;
  if (appStore.needsBackup)
    message += "  NOTE: You currently need to back up your data.";
  $q.dialog({
    title: "Confirm",
    message,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    store.clear();
    const addresses = useAddressStore()
    addresses.records.forEach(a => {
      a.lastBlockSync = 0;
    });
  });
}
const filtered = computed(() => {
  //return [{ id: 'test' }]
  const appStore = useAppStore();
  let txs = store.accountTxs;
  txs = filterByAccounts(txs, appStore.selectedAccounts);
  txs = filterByYear(txs, appStore.taxYear)
  return txs;
});


</script>
