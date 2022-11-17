<template>
  <q-page class="q-pa-md" id="pageAddresses">
    <q-dialog v-model="edit" ref="addressDlg">
      <q-card @keyup.ctrl.enter="saveAddress" style="min-width: 600px; max-width: 80vw;">
        <q-card-section>
          <q-banner v-if="error" inline-actions dense rounded class="text-white bg-red ">
            <div class="text-caption" v-html="error"></div>
          </q-banner>
          <address-form v-model="record" v-model:error="error"> </address-form>
        </q-card-section>
        <q-card-actions align="right" class="text-primary">
          <q-btn v-if="record.id" flat color="red" label="Delete" @click="deleteAddress" />
          <q-btn flat color="green" label="Save" @click="saveAddress" />
          <q-btn flat label="Cancel" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-item class="q-mb-lg">
      <q-item-section>
        <q-input
          label="Filter by Name or Acct"
          v-model="filter"></q-input>
      </q-item-section>
      <q-item-section>
        <q-select style="width: 100px" v-model="chainFilter" :options="chainStore.chains" clearable label="Chain"
          @keyup.esc="chainFilter = null" />
      </q-item-section>
      <q-item-section side>
        <q-btn label="Add" @click="addAddress"></q-btn>
      </q-item-section>
    </q-item>
    <q-separator></q-separator>
    <q-table
      dense
      title="Addresses"
      :rows="filteredAddresses"
      row-key="addressId"
      @row-click="editAddress"
      v-model:pagination="pagination"
      :columns="columns"
      :rows-per-page-options="[0]">
      <template v-slot:top-right>
        <q-btn
          class="q-ml-lg"
          color="negative"
          label="Clear Unnamed"
          @click="addressStore.clearUnnamed()" />
      </template>
    </q-table>
  </q-page>
</template>

<script setup>

import { ref, computed, reactive, toRefs } from 'vue'
import { useAddressStore } from 'stores/address-store'

import AddressForm from 'components/AddressForm.vue'
import { fields } from 'src/models/address'
import { useColumns } from 'src/use/useColumns'
import { useChainStore } from 'src/stores/chain-store'

const columns = useColumns(fields)
const store = useAddressStore()
const chainStore = useChainStore()

const filter = ref('')
const chainFilter = ref('')
const error = ref("")

const pagination = { rowsPerPage: 0 }

const edit = ref(false)
const record = reactive({})
const addAddress = () => {
  error.value = ''
  Object.assign(record, store.initValue)
  edit.value = true
}
const deleteAddress = () => {
  error.value = ''
  if (record.id) store.delete(record.id)
  edit.value = false
}


const editAddress = (evt, row, index) => {
  error.value = ''
  Object.assign(record, row)
  edit.value = true
}
const saveAddress = () => {
  error.value = store.set(record)
  edit.value = error.value != ''
  //console.log(edit.value)
}


const filteredAddresses = computed(() => {

  if (filter.value.trim() == '' && !chainFilter.value) return store.records

  return store.records.filter((r) => r.chain == chainFilter.value || !chainFilter.value).filter((r) =>
    r.name.toLowerCase().includes(filter.value.toLowerCase()) ||
    r.address.toLowerCase().includes(filter.value.toLowerCase()))
})
</script>
