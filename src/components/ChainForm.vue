<template>
  <q-form>
    <div class="row q-pa-sm">
      <div class="col-12 col-sm-8 q-pr-sm">
        <q-input v-model="value.name" label="Name" v-autofocus
          :rules="[(val) => (val && val.trim() != '') || 'Name is required']">
        </q-input>
      </div>
      <div class="col-12 col-sm-4">
        <q-input v-model="value.symbol" label="Symbol"></q-input>
      </div>
    </div>
  </q-form>
</template>

<script setup>
import { computed } from 'vue'
import { vAutofocus } from 'src/directives/vAutofocus'
//TODO add to use to handle this?

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

