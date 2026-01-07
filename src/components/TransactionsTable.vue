<template>
  <q-table
    :row-key="rowKey ?? 'id'"
    dense
    :title="title"
    :rows="rows"
    :columns="columns"
    v-bind="$attrs"
    v-model:pagination="pagination"
    @rowClick="rowClick"
    :rows-per-page-options="[0]"
    :table-style="{ height: tableHeight }"
    ref="transactionTable">
    <template v-slot:top-right>
      <slot name="top-right"></slot>
    </template>

    <!-- <template v-slot:body-cell-id="props">
        <q-td :props="props.props">
          <div>
            <q-badge color="purple" :label="props.value" />
          </div>
          <div class="my-table-details">
            {{ props.row.details }}
          </div>
        </q-td>
      </template> -->
  </q-table>
</template>
<script setup>
import { computed, ref, watch, onMounted } from "vue";
import { useQuasar } from "quasar";
import { getScanProviders } from "src/services/scan-providers";

const $q = useQuasar();

const props = defineProps({
  title: String,
  rows: Array,
  columns: Array,
  onRowClick: Function,
  rowKey: String,
});
const page = ref(1);
const ready = ref(false);
const transactionTable = ref(null);
const tableDimensions = computed(() => {
  if (!ready.value || $q.screen.height == 0 || !transactionTable.value) return;
  const el = transactionTable.value.$el;
  const pixels = $q.screen.sm ? $q.screen.height : $q.screen.height - 50; //header assumed to be 50px
  const titleHeight = el.firstChild.offsetHeight;
  const headerHeight = el.children[1].firstChild.firstChild.offsetHeight;
  const footerHeight = el.children[2].offsetHeight;
  const rowPixels = pixels - titleHeight - headerHeight - footerHeight;
  //the tableHeight needs to account for the header height
  return { rowPixels, tablePixels: rowPixels + headerHeight };

});
const pagination = computed({
  get(x) {
    if (!tableDimensions.value) return { rowsPerPage: 1 };
    //TODO get an actual row height, don't hard code 28
    const rows = Math.floor(tableDimensions.value.rowPixels / 28.5);
    return { rowsPerPage: rows, page: page.value };
  },
  set(val) {
    page.value = val.page;
  },
});
const tableHeight = computed(() => {
  if (!tableDimensions.value) return;
  return tableDimensions.value.tablePixels + "px";
});

//watch(() => this.data, () => { this.page = 1 })

const rowClick = function (evt, row, index) {
  if (evt.ctrlKey) {
    if (row?.id?.substring(0, 2) == "0x") {
      const txId = row.id.split("-");
      const scanProviders = getScanProviders();
      const provider = scanProviders.find((sp) => sp.gasType == row.gasType);
      if (provider) window.open(provider.explorerUrl + txId[0]);
    }
    if (row?.hash?.substring(0, 2) == "0x") {

      const scanProviders = getScanProviders();
      const provider = scanProviders.find((sp) => sp.gasType == row.gasType || sp.gasType == row.asset);
      if (provider) window.open(provider.explorerUrl + row.hash);
    }
  } else {
    if (props.onRowClick) {
      props.onRowClick(evt, row, index);
    }
  }
};
onMounted(() => {
  ready.value = true;
});
</script>
