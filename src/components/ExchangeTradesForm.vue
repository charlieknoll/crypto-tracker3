<template>
  <q-form>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input
          v-model="value.date"
          label="Date"
          type="date"
          :stack-label="true"
          v-autofocus></q-input>
      </div>
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.time" data-lpignore="true" mask="fulltime" :stack-label="true" label="Time"></q-input>

      </div>
    </div>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-8 q-pr-sm">
        <q-input v-model="value.exchangeId" label="ExchangeId"></q-input>
      </div>

    </div>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.account" label="Account"></q-input>
      </div>
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.asset" label="Asset"></q-input>
      </div>
      <div class="col-12 col-sm-4">
        <q-input v-model="value.action" label="Action"></q-input>
      </div>
    </div>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.amount" label="Amount"></q-input>
      </div>
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.price" label="Price"></q-input>
      </div>
      <div class="col-12 col-sm-4">
        <q-input v-model="value.currency" label="Currency"></q-input>
      </div>
    </div>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.fee" label="Fee"></q-input>
      </div>
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.feeCurrency" label="Fee Currency"></q-input>
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
import { computed, reactive, watch, onMounted, ref } from "vue";
import { vAutofocus } from "src/directives/vAutofocus";

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
});

const value = ref({});

const emit = defineEmits(["update:modelValue"]);

onMounted(() => {
  value.value = props.modelValue;
});
watch(value, (newValue) => {
  emit('update:modelValue', newValue)
})

// const value = computed({
//   get() {
//     return props.modelValue
//   },
//   set(value) {
//     emit('update:modelValue', value)
//   }
// })
</script>
