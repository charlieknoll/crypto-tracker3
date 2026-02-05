<template>
  <q-page class="q-pa-md">
    <!-- Portfolio Overview Section -->
    <q-card class="q-mb-md">
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">Portfolio Overview</div>
      </q-card-section>
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-8">

            <div class="text-caption text-grey">Total Value</div>
            <div class="text-h5">{{ currency(pricesStore.totalValue) }}</div>
            <q-btn flat label="Refresh Prices" color="primary" @click="refreshPrices" />
          </div>
          <!-- <div class="col-12 col-md-4">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey">Gain/Loss</div>
                <div class="text-h5 text-positive">+5.2% ($13,000)</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-md-4">
            <q-card flat bordered>
              <q-card-section>
                <q-btn flat label="GET COST BASIS" color="primary" @click="getCostBasis" />
              </q-card-section>
            </q-card>
          </div> -->
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <div class="text-h6 q-mb-sm">Major Assets Held</div>
        <q-table :rows="pricesStore.assetPrices" :columns="assetColumns" row-key="name" :pagination="{ rowsPerPage: 5 }"
          flat dense />
      </q-card-section>
    </q-card>

    <!-- Important Dates Section -->
    <q-card class="q-mb-md">
      <q-card-section class="bg-accent text-white">
        <div class="text-h6">Important Dates</div>
      </q-card-section>

      <q-separator />
      <q-card-section>
        <q-list bordered separator>
          <q-item v-for="(event, index) in events" :key="index">
            <q-item-section>
              <q-item-label>{{ event.title }}</q-item-label>
              <q-item-label caption>{{ event.date }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Helpful Links Section -->
    <q-card>
      <q-card-section class="bg-secondary text-white">
        <div class="text-h6">Helpful Links</div>
      </q-card-section>
      <q-card-section>
        <q-list bordered separator>
          <q-item clickable tag="a" href="https://app.ens.domains/0x003829f919A5F512d54319c5e6894c55E36a74E7">
            <q-item-section>ENS App</q-item-section>
          </q-item>
          <q-item clickable tag="a" href="https://github.com/charlieknoll/offline-tx-signer">
            <q-item-section>Offline Tx Signer/Helper</q-item-section>
          </q-item>

        </q-list>
      </q-card-section>
    </q-card>

  </q-page>
</template>
<script setup>
import { nextTick, onMounted, ref } from 'vue';
// import QCalendar from '@quasar/quasar-ui-qcalendar'
import { useCostBasisStore } from 'src/stores/cost-basis-store';
import { format, useQuasar } from 'quasar';
import { formatEther } from 'ethers';
import { currency } from 'src/utils/number-helpers';
import { usePricesStore } from 'src/stores/prices-store';
import { useRunningBalancesStore } from 'src/stores/running-balances-store';
import { useAppStore } from 'src/stores/app-store';
const $q = useQuasar();
const today = ref(new Date().toISOString().split('T')[0]);
const getCostBasis = () => {
  // Placeholder function for GET COST BASIS button
  const costBasisStore = useCostBasisStore();
  try {
    console.time('Get Cost Basis Total Time');
    const result = costBasisStore.costBasisData;
    if (!result) throw new Error("error getting cost basis")
    console.log(costBasisStore.costBasisData)
    // log account/asset totals
    const undisposedLotsByAccountAsset = result.heldLots.reduce((acc, lot) => {
      acc[lot.account] = acc[lot.account] || {};
      acc[lot.account][lot.asset] = (acc[lot.account][lot.asset] || BigInt("0")) + lot.remainingAmount;
      return acc;
    }, {});

    //Iterate over undisposedLotsByAccountAsset and log totals
    for (const [account, assets] of Object.entries(undisposedLotsByAccountAsset)) {
      for (const [asset, amount] of Object.entries(assets)) {
        const formattedAmount = formatEther(amount);
        console.log(`Account: ${account}, Asset: ${asset}, Undisposed Amount: ${formattedAmount}`);
      }
    }



    //console.log('Undisposed Lots by Account and Asset:', undisposedLotsByAccountAsset);
    // console.log('Total Cost Basis:', result.totalCostBasis);
    // console.log('Total Proceeds:', result.totalProceeds);
    // console.log('Total Gain/Loss:', result.totalGainLoss);



  } catch (error) {
    //console.error("Error importing chain txs:", error);

    $q.notify({
      message: error.message,
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
  finally {
    console.timeEnd('Get Cost Basis Total Time');
  }
};

const pricesStore = usePricesStore();

const assetColumns = [
  { name: 'asset', label: 'Asset', field: 'asset', align: 'left' },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right' },
  { name: 'price', label: 'Price', field: 'price', align: 'right', format: currency },
  { name: 'currentValue', label: 'Current Value', field: 'currentValue', align: 'right', format: currency },

];
const refreshPrices = async function () {



  pricesStore.getCurrentPrices()
}
onMounted(async () => {
  // Placeholder data for major assets held
  const app = useAppStore();

  while (1) {
    //make sure at least 1 minute has passed since last price update before refreshing prices to avoid hitting rate limits
    const now = new Date();
    const lastPriceUpdate = app.lastPricesUpdate ? new Date(app.lastPricesUpdate) : null;
    if (!lastPriceUpdate || (now - lastPriceUpdate) > 60000) {
      await refreshPrices();
      app.lastPricesUpdate = now.toISOString();
    }
    await new Promise(resolve => setTimeout(resolve, 30000)); // Check every 30 seconds
  }
});




// TODO save current prices to store as type "Current", save previous day's price as type "Previous", this will allow gain/loss percentage
//TODO: add tracked tokens
//TODO add icons?
//TODO add link to running balances
// TODO add refresh button to get latest prices
// TODO add refresh button to get chain txs
//TODO add refresh interval

const events = ref([
  { title: 'iamtraci.eth Expires', date: '2030-03-06' },
  { title: 'charlieknoll.eth Expires', date: '2030-05-03' },
  { title: 'bikeparts.eth Expires', date: '2030-05-03' },
]);
</script>
