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
    <transactions-table title="Chain Transactions" :rows="filtered" :columns="columns" @rowClick="edit"
      @row-contextmenu="onRowRightClick">
      <template v-slot:top-right>
        <div class="row">
          <q-toggle label="Unnamed" v-model="unnamed" class="q-pr-sm"></q-toggle>
          <q-toggle label="Only Tokens" v-model="onlyTokens" class="q-pr-sm"></q-toggle>
          <q-input v-alpha-numeric clearable style="width: 300px; display: inline-block; min-height: 61px"
            input-style="min-height: 61px;" label="Filter by tx or address hash" class="q-mr-md" v-model="hashFilter"
            filled></q-input>
          <div>
            <account-filter :options="accounts"></account-filter>
          </div>
          <div>
            <asset-filter></asset-filter>
          </div>
          <base-select style="width: 220px" multiple popup-content-class="dropdown" v-model="app.selectedChains"
            :options="chainStore.chains" label="Chain" />
          <div>
            <q-btn class="q-ml-sm" color="primary" label="Import" @click="importChainTxs" />
            <q-btn class="q-ml-sm" color="primary" label="Import ETH Prices" @click="importPrices" />
            <q-btn class="q-ml-sm" color="negative" label="Clear" @click="clear" />
          </div>
        </div>
      </template>
    </transactions-table>
    <q-menu touch-position v-model="showMenu" :target="menuTarget">
      <q-list dense>
        <!-- <q-item clickable v-close-popup @click="edit">
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>Edit</q-item-section>
        </q-item> -->

        <q-item clickable v-close-popup @click="setSpam">
          <q-item-section avatar>
            <q-icon name="delete" color="negative" />
          </q-item-section>
          <q-item-section>Spam</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
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
import { assert } from "ethers";
import { showWarning } from "src/use/useShowWarning";

const store = useChainTxsStore();
const app = useAppStore()
const chainStore = useChainStore()


const $q = useQuasar();


const clickedRow = ref(null);
const showMenu = ref(false);
const menuTarget = ref(null);

const columns = ref(useColumns(fields));
const hashFilter = ref("");
const unnamed = ref(false);
const onlyTokens = ref(false)
const editing = ref(false);
const error = ref("")
const record = reactive({})
let initPrice = 0.0;

function onRowRightClick(evt, row) {
  evt.preventDefault()  // stop browser context menu
  clickedRow.value = row
  menuTarget.value = evt.target
  showMenu.value = true
}
const setSpam = () => {
  if (!clickedRow.value) return;
  const addresses = useAddressStore()
  let toAddress = addresses.records.find((a) => a.address == clickedRow.value.toAddress && a.chain == clickedRow.value.gasType)
  let fromAddress = addresses.records.find((a) => a.address == clickedRow.value.fromAddress && a.chain == clickedRow.value.gasType)
  if (fromAddress && fromAddress.name.substring(0, 2) == '0x') {
    fromAddress.name = 'Spam'
    fromAddress.type = 'Spam'
    addresses.set(fromAddress)
  }
  if (toAddress && toAddress.name.substring(0, 2) == '0x' && clickedRow.value.txType == 'T') {
    toAddress.name = 'Spam'
    toAddress.type = 'Spam'
    addresses.set(fromAddress)
  }

}
const edit = (evt, row, index) => {
  if (evt.altKey) {
    console.log(row)
    return;
  }
  const addresses = useAddressStore()
  const toAddress = addresses.records.find((a) => a.address == row.toAddress && a.chain == row.gasType)
  const fromAddress = addresses.records.find((a) => a.address == row.fromAddress && a.chain == row.gasType)
  if (!toAddress || !fromAddress) return
  if (evt.shiftKey) {
    console.log("To Address:", toAddress)
    return;
  }

  error.value = ''
  initPrice = row.price
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
    asset: row.asset,
    price: row.price,
    timestamp: row.timestamp,

  })
  editing.value = true
}
const importPrices = async function () {
  try {
    const prices = usePricesStore()
    await prices.getETHPrices();
  } catch (error) {
    console.error("Error importing ETH prices:", error);

    $q.notify({
      message: "Could not download ETH prices, please check that the Ether Price API is running on localhost:3000...",
      color: "negative",
      icon: "warning",
      timeout: 0,  // 0 = no auto-close
      position: 'center',
      //closeBtn: 'Close',  // Show close button
      actions: [
        {
          label: 'Dismiss',
          color: 'white'
        }
      ]
    });
  }
}
const importChainTxs = async function () {

  const addresses = useAddressStore()
  try {
    await store.import();
    await addresses.updateBalances()
  } catch (error) {
    showWarning($q, "Could not download chain txs, please check Etherscan API key in settings:\n" + error.message);
  }
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
  if (record.price != 0.0 && record.price != initPrice) {
    const prices = usePricesStore()
    prices.set({
      asset: record.asset,
      timestamp: record.timestamp,
      price: record.price
    })
  }


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
        tx.fromAccountName.substring(0, 2) == "0x" || (tx.taxCode ?? "") == "" && tx.methodName != '0x' && !tx.methodName);
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
        tx.hash?.includes(hashFilter.value) ||
        tx.toAddress?.includes(hashFilter.value) ||
        tx.fromAddress?.includes(hashFilter.value)
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
