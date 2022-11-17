<template>
  <q-form>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-8 q-pr-sm">
        <q-input v-model="value.name" label="Name" v-autofocus
          :rules="[(val) => (val && val.trim() != '') || 'Name is required']">
        </q-input>
      </div>
      <div class="col-12 col-sm-4">
        <q-select v-model="value.type" :options="options" label="Type" />
      </div>
    </div>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-8  q-pr-sm">
        <q-input v-model="value.address" label="Address"></q-input>
      </div>
      <div class="col-12 col-sm-4">
        <q-select v-model="value.chain" :options="chainStore.chains" required label="Chain" />
      </div>
    </div>
  </q-form>
</template>

<script setup>
import { computed } from 'vue'
import { vAutofocus } from 'src/directives/vAutofocus'
import { useChainStore } from 'src/stores/chain-store';
//TODO add to use to handle this?
const chainStore = useChainStore()

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})


const emit = defineEmits(['update:modelValue'])

const value = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  }
})

const options = [
  "Owned",
  "Exchange Owned",
  "Contract Owned",
  "Gift",
  "Token",
  "Tax Deductible Donation",
  "Spending",
  "Expense",
  "Income",
]
</script>

