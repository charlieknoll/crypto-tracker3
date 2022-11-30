<template>
  <q-page class="q-pa-md" id="pageAddresses">
    <q-dialog v-model="edit" ref="addressDlg">
      <q-card @keyup.ctrl.enter="saveAddress" style="min-width: 600px; max-width: 80vw">
        <q-card-section>
          <q-banner v-if="error" inline-actions dense rounded class="text-white bg-red">
            <div class="text-caption" v-html="error"></div>
          </q-banner>
          <address-form v-model="record" v-model:error="error"> </address-form>
        </q-card-section>
        <q-card-actions align="right" class="text-primary">
          <q-btn
            v-if="record.id"
            flat
            color="red"
            label="Delete"
            @click="deleteAddress" />
          <q-btn flat color="green" label="Save" @click="saveAddress" />
          <q-btn flat label="Cancel" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-separator></q-separator>
    <q-table
      dense
      title="Addresses"
      :rows="filteredAddresses"
      row-key="addressId"
      @row-click="rowClick"
      v-model:pagination="pagination"
      :columns="columns"
      :rows-per-page-options="[0]">
      <template v-slot:top-right>
        <div class="row">
          <q-input
            clearable
            style="width: 300px; display: inline-block; min-height: 61px;"
            input-style="min-height: 61px;"
            label="Filter by Name or Address"
            class="q-mr-md"
            v-model="filter"
            filled></q-input>
          <base-select style="width: 220px"
            multiple
            popup-content-class="dropdown"
            v-model="app.selectedChains"
            :options="chainStore.chains"
            label="Chain" />

        </div>
        <div>
          <q-btn class="q-ml-sm" color="secondary" label="Add" @click="add" />
          <q-btn class="q-ml-sm" color="negative" label="Clear" @click="clear" />
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, computed, reactive, toRefs } from "vue";
import { useAddressStore } from "stores/address-store";
import BaseSelect from "src/components/Base/BaseSelect.vue";
import AddressForm from "components/AddressForm.vue";
import { fields } from "src/models/address";
import { useColumns } from "src/use/useColumns";
import { useChainStore } from "src/stores/chain-store";
import { useAppStore } from "src/stores/app-store";
import { useQuasar } from "quasar";
import Repo from "src/utils/repo-helpers";
import { hasValue } from "src/utils/model-helpers";
import { getScanProviders } from "src/services/scan-providers";
const $q = useQuasar();
const columns = useColumns(fields);
const store = useAddressStore();
const app = useAppStore();

const repo = new Repo("Addresses", store, $q)

const { clear } = repo

const chainStore = useChainStore();

const filter = ref("");
const chainFilter = reactive([]);
const error = ref("");

const pagination = { rowsPerPage: 0 };

const edit = ref(false);
const record = reactive({});
const add = () => {
  error.value = "";
  Object.assign(record, store.initValue);
  edit.value = true;
};
const deleteAddress = () => {
  error.value = "";
  if (record.id) store.delete(record.id);
  edit.value = false;
};
const rowClick = (evt, row, index) => {
  if (evt.ctrlKey) {
    if (row?.address.substring(0, 2) == "0x") {

      const scanProviders = getScanProviders();
      const provider = scanProviders.find((sp) => sp.gasType == row.chain);
      if (provider) window.open(provider.explorerUrl.replace("/tx/", "/address/") + row.address);
    }
  } else {
    editAddress(evt, row, index)
  }
}
const editAddress = (evt, row, index) => {
  error.value = "";
  Object.assign(record, store.initValue);
  Object.assign(record, row);
  edit.value = true;
};
const saveAddress = () => {
  error.value = store.set(record);
  edit.value = error.value != "";
  //console.log(edit.value)
};

const filteredAddresses = computed(() => {

  const app = useAppStore()

  if (!hasValue(filter.value) && app.selectedChains?.length == 0) return store.records;

  let result = store.records
    .filter(
      (r) =>
        r.name.toLowerCase().includes((filter.value ?? "").toLowerCase()) ||
        r.address.toLowerCase().includes((filter.value ?? "").toLowerCase())
    );

  if (app.selectedChains?.length > 0) {
    result = result.filter((a) => {
      return app.selectedChains.findIndex((c) => c == a.chain) > -1;
    });
    //console.log(chainFilter)
  }
  return result
});
</script>
<style>
/* .dropdown .q-item {
  min-height: 30px !important;
}  */
</style>
