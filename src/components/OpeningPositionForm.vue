<template>
  <q-form>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-8 q-pr-sm">
        <q-input v-model="value.date" label="Date"
          type="date" :stack-label="true" v-autofocus></q-input>
      </div>

    </div>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-8  q-pr-sm">
        <q-input v-model="value.account" label="Account"></q-input>
      </div>
      <div class="col-12 col-sm-4">
        <q-input v-model="value.asset" label="Asset"></q-input>
      </div>
    </div>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-3  q-pr-sm">
        <q-input v-model="value.amount" label="Amount"></q-input>
      </div>
      <div class="col-12 col-sm-3">
        <q-input v-model="value.price" label="Price"></q-input>
      </div>
      <div class="col-12 col-sm-3">
        <q-input v-model="value.fee" label="Fee"></q-input>
      </div>
      <div class="col-12 col-sm-3">
        <q-input v-model="value.cost" label="Cost"></q-input>
      </div>
    </div>
    <div class="row q-pa-sm">
      <div class="col-12 q-pr-sm">
        <q-input v-model="value.memo" label="Memo"></q-input>
      </div>
    </div>

  </q-form>
</template>

<script setup>
import { computed } from 'vue'
import { vAutofocus } from 'src/directives/vAutofocus'

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
</script>

