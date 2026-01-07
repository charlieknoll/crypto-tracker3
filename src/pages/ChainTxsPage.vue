<template>
  <q-page>
    <q-dialog v-model="editing">
      <q-card @keyup.ctrl.enter="save" style="min-width: 500px">
        <q-card-section>
          <q-banner v-if="error" inline-actions dense rounded class="text-white bg-red ">
            <div class="text-caption" v-html="error"></div>
          </q-banner>
          <chain-tx-form v-model="record" v-model:error="error"> </chain-tx-form>
        </q-card-section>
        <q-card-actions align="right" class="text-primary">
          <q-btn flat color="green" label="Save" @click="save" />
          <q-btn flat label="Cancel" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <transactions-table
      title="Chain Transactions"
      :rows="filtered"
      :columns="columns"
      @rowClick="edit">
      <template v-slot:top-right>
        <div class="row">
          <q-toggle label="Unnamed" v-model="unnamed" class="q-pr-sm"></q-toggle>
          <q-toggle label="Only Tokens" v-model="onlyTokens" class="q-pr-sm"></q-toggle>
          <q-input
            v-alpha-numeric
            clearable
            style="width: 300px; display: inline-block; min-height: 61px"
            input-style="min-height: 61px;"
            label="Filter by tx or address hash"
            class="q-mr-md"
            v-model="hashFilter"
            filled></q-input>
          <div>
            <account-filter :options="accounts"></account-filter>
          </div>
          <div>
            <asset-filter></asset-filter>
          </div>
          <base-select style="width: 220px"
            multiple
            popup-content-class="dropdown"
            v-model="app.selectedChains"
            :options="chainStore.chains"
            label="Chain" />
          <div>
            <q-btn class="q-ml-sm" color="primary" label="Import" @click="store.import" />
            <q-btn class="q-ml-sm" color="negative" label="Clear" @click="clear" />
          </div>
        </div>
      </template>
    </transactions-table>
  </q-page>
</template>
<script setup>
import { ref, computed, reactive, watchEffect } from "vue";
import TransactionsTable from "src/components/TransactionsTable.vue";
import AccountFilter from "src/components/AccountFilter.vue";
import AssetFilter from "src/components/AssetFilter.vue";
import { fields, tokenFields } from "src/models/chain-tx";
import { useColumns } from "src/use/useColumns";
import { useAppStore } from "src/stores/app-store";
import { filterByAccounts, filterByYear, filterByAssets } from "src/utils/filter-helpers";
import { vAlphaNumeric } from 'src/directives/vAlphaNumeric'
import { useChainTxsStore } from "src/stores/chain-txs-store";
import { useAddressStore } from "src/stores/address-store";
import { useMethodStore } from "src/stores/methods-store";
import { date, useQuasar } from "quasar";
import BaseSelect from "src/components/Base/BaseSelect.vue";
import { useChainStore } from "src/stores/chain-store";
import { usePricesStore } from "src/stores/prices-store";
import { onlyUnique } from "src/utils/array-helpers";
import ChainTxForm from "src/components/ChainTxForm.vue"


const store = useChainTxsStore();
const app = useAppStore()
const chainStore = useChainStore()


const $q = useQuasar();

const onlyUnnamed = ref(false);

const columns = ref(useColumns(fields));
const hashFilter = ref("");
const unnamed = ref(false);
const onlyTokens = ref(false)
const editing = ref(false);
const error = ref("")
const record = reactive({})

const edit = (evt, row, index) => {
  if (evt.altKey) {
    console.log(row)
    return;
  }
  const addresses = useAddressStore()
  const toAddress = addresses.records.find((a) => a.address == row.toAddress && a.chain == row.gasType)
  const fromAddress = addresses.records.find((a) => a.address == row.fromAddress && a.chain == row.gasType)
  if (!toAddress || !fromAddress) return

  error.value = ''
  Object.assign(record, {
    toAddress: toAddress.address,
    toType: toAddress.type,
    toName: toAddress.name,
    fromAddress: fromAddress.address,
    fromType: fromAddress.type,
    fromName: fromAddress.name,
    method: row.method,
    methodName: row.methodName,
    gasType: row.gasType,
    price: row.price,
    timestamp: row.timestamp,

  })
  editing.value = true
}

const save = function () {
  const addresses = useAddressStore()
  const toAddress = addresses.records.find((a) => a.address == record.toAddress && a.chain == record.gasType)
  const fromAddress = addresses.records.find((a) => a.address == record.fromAddress && a.chain == record.gasType)
  let rec = Object.assign({}, toAddress)
  rec.type = record.toType
  rec.name = record.toName

  addresses.set(rec)
  rec = Object.assign({}, fromAddress)
  rec.type = record.fromType
  rec.name = record.fromName
  addresses.set(rec)

  const methods = useMethodStore()
  methods.set({ id: record.method, name: record.methodName })
  const prices = usePricesStore()
  prices.set({
    asset: record.gasType,
    timestamp: record.timestamp,
    price: record.price
  })

  editing.value = false
  //console
}

const clear = function () {

  let message = `Are you sure you want to delete all chain transactions?`;
  if (app.needsBackup) message += "  NOTE: You currently need to back up your data.";
  $q.dialog({
    title: "Confirm",
    message,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    store.clear();
    const addresses = useAddressStore();
    addresses.records.forEach((a) => {
      a.lastBlockSync = 0;
    });
  });
};
const accounts = computed(() => {
  let txs = store.accountTxs;
  txs = filterByYear(txs, app.taxYear);

  let result = txs.map((tx) => tx.toAccountName)
  result = result.concat(txs.map((tx) => tx.fromAccountName))
  return result.filter(onlyUnique).sort();
})
const filtered = computed(() => {
  //return [{ id: 'test' }]

  let txs = store.accountTxs;
  txs = filterByAccounts(txs, app.selectedAccounts, true);
  txs = filterByYear(txs, app.taxYear);
  txs = filterByAssets(txs, app.selectedAssets);
  if (unnamed.value) {

    txs = txs.filter(
      (tx) =>
        tx.toAccountName.substring(0, 2) == '0x' ||
        tx.fromAccountName.substring(0, 2) == "0x"
    );
  }
  if (onlyTokens.value) {
    // let tokenTxs = txs.filter(
    //   (tx) =>
    //     tx.txType == 'T'
    // );
    // txs = txs.filter((tx) => tx.txType == 'T' || tokenTxs.findIndex((ttx) => ttx.hash == tx.hash) > -1);
    txs = txs.filter(
      (tx) =>
        tx.txType == 'T'
    );
  }
  if (hashFilter.value) {
    txs = txs.filter(
      (tx) =>
        tx.id.includes(hashFilter.value) ||
        tx.toAddress.includes(hashFilter.value) ||
        tx.fromAddress.includes(hashFilter.value)
    );
  }
  if (app.selectedChains?.length > 0) {
    txs = txs.filter((tx) => {
      return app.selectedChains.findIndex((c) => c == tx.asset) > -1;
    });
    //console.log(chainFilter)
  }
  return txs;
});
watchEffect(() => {
  columns.value = (onlyTokens.value) ? useColumns(tokenFields) : useColumns(fields)
})
</script>
