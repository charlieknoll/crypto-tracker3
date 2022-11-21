<template>
  <q-form autocomplete="off">
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input
          v-model="value.date"
          v-on:keypress="setDate"
          label="Date"
          type="date"
          :stack-label="true"
          v-autofocus></q-input>
      </div>
      <!-- <div class="col-12 col-sm-4">{{ value.date }}</div> -->
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.time" data-lpignore="true" mask="fulltime" :stack-label="true" label="Time"></q-input>

      </div>
    </div>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-8 q-pr-sm">
        <q-input v-model="value.transferId" data-lpignore="true" label="Transfer Id"></q-input>
      </div>
    </div>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.fromAccount" label="From Account"></q-input>
      </div>
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.toAccount" label="To Account"></q-input>
      </div>
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.asset" label="Asset"></q-input>
      </div>
    </div>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.amount" label="Amount"></q-input>
      </div>
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

const setDate = function () {
  //value.value.date = "2020-10-10"
}
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
