<template>
  <q-page class="q-pa-md">
    <!-- Portfolio Overview Section -->
    <q-card class="q-mb-md">
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">Portfolio Overview</div>
      </q-card-section>
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey">Total Value</div>
                <div class="text-h5">$250,000</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-md-4">
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
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <div class="text-h6 q-mb-sm">Major Assets Held</div>
        <q-table
          :rows="assets"
          :columns="assetColumns"
          row-key="name"
          :pagination="{ rowsPerPage: 5 }"
          flat />
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
import { ref } from 'vue';
// import QCalendar from '@quasar/quasar-ui-qcalendar'
import { useCostBasisStore } from 'src/stores/cost-basis-store';
const today = ref(new Date().toISOString().split('T')[0]);
const getCostBasis = () => {
  // Placeholder function for GET COST BASIS button
  const costBasisStore = useCostBasisStore();
  try {
    console.time('Get Cost Basis Total Time');
    const result = costBasisStore.costBasisData;
  } finally {
    console.timeEnd('Get Cost Basis Total Time');
  }
};

const assets = ref([
  { name: 'Apple Inc.', symbol: 'AAPL', value: '$50,000', percentage: '20%' },
  { name: 'Tesla Inc.', symbol: 'TSLA', value: '$40,000', percentage: '16%' },
  { name: 'Bitcoin', symbol: 'BTC', value: '$30,000', percentage: '12%' },
  { name: 'Gold ETF', symbol: 'GLD', value: '$25,000', percentage: '10%' },
  { name: 'Real Estate Fund', symbol: 'REIT', value: '$20,000', percentage: '8%' },
]);

const assetColumns = [
  { name: 'name', label: 'Asset Name', field: 'name', align: 'left' },
  { name: 'symbol', label: 'Symbol', field: 'symbol', align: 'center' },
  { name: 'value', label: 'Value', field: 'value', align: 'right' },
  { name: 'percentage', label: 'Percentage', field: 'percentage', align: 'right' },
];

const events = ref([
  { title: 'iamtraci.eth Expires', date: '2030-03-06' },
  { title: 'charlieknoll.eth Expires', date: '2030-05-03' },
  { title: 'bikeparts.eth Expires', date: '2030-05-03' },
]);
</script>
