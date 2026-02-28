<template>
  <q-page class="constrain q-pa-md" id="pageSettings">
    <div class="q-table__title">Settings</div>
    <!-- <div>{{startYearType}}</div> -->
    <q-form class="q-gutter-md q-pa-lg">
      <q-btn label="Reset Settings" @click="resetSettings" color="grey"></q-btn>
      <q-btn label="Clear All Data" @click="resetDataAndSettings" color="grey"></q-btn>

      <q-input
        type="number"
        filled
        v-model="startYearView"
        label="Start Year"
        hint="Not including opening positions"
        ref="startYearInput"
        debounce="1000"
        lazy-rules
        :rules="[(val) => parseInt(val) >= app.minStartYear || 'Invalid year']" />
      <q-input
        filled
        v-model="settings.etherscanApikey"
        label="Etherscan API KEY"
        hint="Go to etherscan.io and create a key"
        lazy-rules
        :rules="[(val) => (val && val.length == 34) || 'Invalid API KEY']" />
      <q-input
        filled
        v-model="settings.bscApikey"
        label="BscScan API KEY"
        hint="Go to bscscan.com and create a key"
        lazy-rules
        :rules="[(val) => (val && val.length == 34) || 'Invalid API KEY']" />
      <q-input
        filled
        v-model="settings.baseCurrencies"
        label="Base Currencies"
        hint="Comma delimited list (e.g. USDT, TUSD, USDC, DAI)" />
      <q-input
        filled
        v-model="settings.trackedTokens"
        label="Additional Tracked Tokens (Non Spent)"
        hint="Comma delimited list (e.g. OMG, KICK, etc)" />
      <q-checkbox
        left-label
        v-model="settings.trackSpentTokens"
        label="Track Spent Tokens" />
      <q-input filled v-model="settings.krakenApikey" label="Kraken API Key" />
      <q-input filled v-model="settings.krakenPrivateKey" label="Kraken Private Key" />
      <q-input filled v-model="settings.coindeskApikey" label="CoinDesk API Key" />
      <q-input filled v-model="settings.cbpApikey" label="Coinbase API Key" />
      <q-input filled v-model="settings.cbpSecret" label="Coinbase Secret" />
      <q-input filled v-model="settings.cbpPassphrase" label="Coinbase Passphrase" />
    </q-form>
  </q-page>
</template>

<script setup>
import { useSettingsStore } from "src/stores/settings-store";
import { useAppStore } from "src/stores/app-store";
import { ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAddressStore } from "src/stores/address-store";
import { useChainStore } from "src/stores/chain-store";
import { useOpeningPositionsStore } from "src/stores/opening-positions-store";
import { useExchangeTradesStore } from "src/stores/exchange-trades-store";
import { useQuasar } from "quasar";
import { useOffchainTransfersStore } from "src/stores/offchain-transfers-store";
import { usePricesStore } from "src/stores/prices-store";
import { useMethodStore } from "src/stores/methods-store";
import { useChainTxsStore } from "src/stores/chain-txs-store";
import { useLedgersStore } from "src/stores/ledgers-store";


const $q = useQuasar();
const app = useAppStore();

const settings = useSettingsStore();
const addresses = useAddressStore();
const chains = useChainStore();
const openingPositions = useOpeningPositionsStore();
const exchangeTrades = useExchangeTradesStore();
const offchainTransfers = useOffchainTransfersStore()
const prices = usePricesStore()
const methods = useMethodStore()
const chainTxs = useChainTxsStore()
const ledgers = useLedgersStore()

//do this to enable intermediate validation and conversion
const startYearView = ref(settings.startYear);
const startYearInput = ref(null);

//TODO maybe use "toRef?"
const { startYear } = storeToRefs(settings);
watch(startYear, (newValue) => {
  startYearView.value = newValue;
});
watch(startYearView, (newValue, oldValue) => {
  startYearInput.value.validate(newValue);
  if (!startYearInput.value.hasError) {
    settings.startYear = parseInt(newValue);
  }
});

const resetSettings = function () {
  localStorage.clear();
  //const tempState = JSON.stringify(settings.$state)
  settings.$reset();
  app.$reset();

  //settings.$patch(JSON.parse(tempState))
};
const clearAll = function () {
  localStorage.clear();
  settings.$reset();
  app.$reset();
  chains.$reset();
  addresses.$reset();
  openingPositions.$reset();
  exchangeTrades.$reset();
  ledgers.$reset();
  offchainTransfers.$reset();

  //TODO for some reason prices.$reset doesn't work, it sets value to false, maybe because it has an async method?
  prices.records = [];
  methods.$reset();
  chainTxs.$reset();

  app.needsBackup = false;
}
const resetDataAndSettings = function () {

  if (!app.needsBackup) {
    clearAll();
    return;
  }
  const message =
    "Are you sure you want to clear all data?  NOTE: You currently need to back up your data.";
  $q.dialog({
    title: "Confirm",
    message,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    clearAll()
  });
};
//const startYearType = computed(() => typeof (startYear.value))
</script>
