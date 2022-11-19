<template>
  <q-table
    row-key="id"
    dense
    :title="title"
    :rows="rows"
    :columns="columns"
    v-bind="$attrs"
    v-model:pagination="pagination"
    @rowClick="rowClick"
    :rows-per-page-options="[0]"
    :table-style="{ height: tableHeight              }"
    ref="transactionTable">
    <template v-slot:top-right>
      <slot name="top-right"></slot>
    </template>
  </q-table>
</template>
<script setup>
import { computed, ref, watch, onMounted } from "vue";
import { useQuasar } from "quasar";
const $q = useQuasar();

const props = defineProps({
  title: String,
  rows: Array,
  columns: Array,
  onRowClick: Function
});
const page = ref(1);
const ready = ref(false);
const transactionTable = ref(null)
const pagination = computed({
  get(x) {
    if (!ready.value) return { rowsPerPage: 1 };
    if ($q.screen.height == 0) return { rowsPerPage: 1 };
    if (!transactionTable.value) return { rowsPerPage: 1 };
    const el = transactionTable.value.$el
    const pixels = $q.screen.sm
      ? $q.screen.height
      : $q.screen.height - 50;
    const titleHeight =
      el.firstChild.offsetHeight;
    const headerHeight =
      el.children[1].firstChild.firstChild
        .offsetHeight;
    const footerHeight =
      el.children[2].offsetHeight;
    const rowPixels = pixels - titleHeight - headerHeight - footerHeight; //table title, row header, row-footer
    //const rowPixels = pixels - 78 - 28 - 33; //table title, row header, row-footer

    //TODO get an actual row height, don't hard code 28
    const rows = Math.floor(rowPixels / 29);

    return { rowsPerPage: rows, page: page.value };
  },
  set(val) {
    page.value = val.page;
  },
});
const tableHeight = computed(() => {

  if ($q.screen.height == 0) return;
  const allRowsHeight = (props.data?.length ?? 0) * 28
  const maxHeight = $q.screen.sm
    ? $q.screen.height
    : $q.screen.height - 157
  return maxHeight + 'px';
  return maxHeight
  return (allRowsHeight < maxHeight ? allRowsHeight : maxHeight) + "px"
});

//watch(() => this.data, () => { this.page = 1 })

const rowClick = function (evt, row, index) {
  if (props.onRowClick) {
    props.onRowClick(evt, row, index)
  }

};
onMounted(() => {
  ready.value = true;
});
</script>
