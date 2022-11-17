<template>
  <q-page class="q-pa-md" id="chainPage">
    <q-dialog v-model="editing">
      <q-card @keyup.ctrl.enter="save" style="min-width: 500px">
        <q-card-section>
          <q-banner v-if="error" inline-actions dense rounded class="text-white bg-red ">
            <div class="text-caption" v-html="error"></div>
          </q-banner>
          <chain-form v-model="record" v-model:error="error"> </chain-form>
        </q-card-section>
        <q-card-actions align="right" class="text-primary">
          <q-btn v-if="record.id" flat color="red" label="Delete" @click="remove" />
          <q-btn flat color="green" label="Save" @click="save" />
          <q-btn flat label="Cancel" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-item class="q-mb-lg">
      <q-item-section side>
        <q-btn label="Add" @click="add"></q-btn>
      </q-item-section>
    </q-item>
    <q-separator></q-separator>
    <q-table
      dense
      title="Chains"
      :rows="chainStore.records"
      row-key="id"
      @row-click="edit"
      v-model:pagination="pagination"
      :columns="columns"
      :rows-per-page-options="[0]">
    </q-table>
  </q-page>
</template>

<script setup>

import { ref, reactive } from 'vue'
import { useChainStore } from 'stores/chain-store'

import chainForm from 'components/chainForm.vue'
import chainFields from 'src/models/chain'
import { useColumns } from 'src/use/useColumns'

const columns = useColumns(chainFields)
const chainStore = useChainStore()

const error = ref("")

const pagination = { rowsPerPage: 0 }

const editing = ref(false)
const record = reactive({})
const add = () => {
  error.value = ''
  Object.assign(record, chainStore.initValue)
  editing.value = true
}
const remove = () => {
  error.value = ''
  if (record.id) chainStore.delete(record.id)
  editing.value = false
}


const edit = (evt, row, index) => {
  error.value = ''
  Object.assign(record, row)
  editing.value = true
}
const save = () => {
  error.value = chainStore.set(record)
  editing.value = error.value != ''
  //console.log(edit.value)
}
</script>
