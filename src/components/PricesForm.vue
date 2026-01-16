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
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.asset" data-lpignore="true" label="Asset"></q-input>
      </div>
      <div class="col-12 col-sm-4 q-pr-sm">
        <q-input v-model="value.price" label="Price"></q-input>
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
  //console.log(value.value)
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
