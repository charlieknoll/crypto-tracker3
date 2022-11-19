<template>
  <q-page class="constrain q-pa-md" id="pageBackup">
    <div class="q-table__title">Backup</div>
    <q-form class="q-gutter-md q-pa-lg">
      <q-btn label="Download All" @click="downloadAll" color="grey"></q-btn>
    </q-form>
  </q-page>
</template>


<script setup>

import { useSettingsStore } from 'src/stores/settings-store';
import { useQuasar, exportFile } from 'quasar'
import { useAppStore } from 'src/stores/app-store';
import { useChainStore } from 'src/stores/chain-store';
import { useAddressStore } from 'src/stores/address-store';
import { useOpeningPositionsStore } from 'src/stores/opening-positions-store';
import { useExchangeTradesStore } from 'src/stores/exchange-trades-store';
import { useOffchainTransfersStore } from 'src/stores/offchain-transfers-store';

const $q = useQuasar()

const downloadAll = async function () {
  const settings = useSettingsStore()
  const app = useAppStore()
  const chains = useChainStore()
  const addresses = useAddressStore()
  const openingPositions = useOpeningPositionsStore()
  const exchangeTrades = useExchangeTradesStore()
  const offchainTransfers = useOffchainTransfersStore()

  //const test = { ...mapState(settings) }
  const backup = {
    settings: settings.$state,
    chains: chains.$state,
    addresses: addresses.$state,
    openingPositions: openingPositions.$state,
    exchangeTrades: exchangeTrades.$state,
    offchainTransfers: offchainTransfers.$state,

  }

  const pStatus = await exportFile("all-data.json", JSON.stringify(backup), "text/csv");
  if (pStatus !== true) {
    $q.notify({
      message: "Browser denied file download...",
      color: "negative",
      icon: "warning",
    });
  }
  else {
    app.needsBackup = false
  }
}
</script>
