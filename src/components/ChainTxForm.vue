<template>
  <q-form>
    <div class="shadow-up-1">
      <div class="row q-pa-sm">
        <div class="col-12 col-sm-8  q-pr-sm">
          <q-field label="To Address" stack-label>
            <template v-slot:control>
              <div class="self-center full-width no-outline">{{ value.toAddress }}</div>
            </template>
          </q-field>
        </div>
      </div>
      <div class="row q-pa-sm">
        <div class="col-12 col-sm-8 q-pr-sm">
          <q-input v-model="value.toName" label="Name" v-autofocus>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-select v-model="value.toType" :options="addressTypes" label="Type" />
        </div>
      </div>
    </div>
    <div class="shadow-up-1 q-mt-sm">
      <div class="row q-pa-sm">
        <div class="col-12 col-sm-8  q-pr-sm">
          <q-field label="From Address" stack-label>
            <template v-slot:control>
              <div class="self-center full-width no-outline">{{ value.fromAddress }}</div>
            </template>
          </q-field>
        </div>
      </div>
      <div class="row q-pa-sm">
        <div class="col-12 col-sm-8 q-pr-sm">
          <q-input v-model="value.fromName" label="Name" v-autofocus>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-select v-model="value.fromType" :options="addressTypes" label="Type" />
        </div>
      </div>
    </div>
    <div class="shadow-up-1 q-mt-sm">
      <div class="row q-pa-sm">
        <div class="col-12 col-sm-8  q-pr-sm">
          <q-field label="Method Hash" stack-label>
            <template v-slot:control>
              <div class="self-center full-width no-outline">{{ value.method }}</div>
            </template>
          </q-field>
        </div>
      </div>
      <div class="row q-pa-sm">
        <div class="col-12 col-sm-8 q-pr-sm">
          <q-input v-model="value.methodName" label="Method Name" v-autofocus>
          </q-input>
        </div>
      </div>
    </div>
    <div class="shadow-up-1 q-mt-sm">
      <div class="row q-pa-sm">
        <div class="col-12 col-sm-8  q-pr-sm">
          <q-input v-model="value.price" :label="`Price (${value.asset})`" v-autofocus>
          </q-input>
        </div>
      </div>

    </div>

  </q-form>
</template>

<script setup>
import { computed } from 'vue'
import { vAutofocus } from 'src/directives/vAutofocus'
import { addressTypes } from 'src/services/address-types';

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
