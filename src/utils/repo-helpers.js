import { useAppStore } from "src/stores/app-store";
import { ref, reactive } from "vue";

function Repo(modelTitle, store, $q) {
  const self = this;

  this.add = function () {
    self.error.value = "";
    Object.assign(self.record, {});
    Object.assign(self.record, store.initValue);
    self.editing.value = true;
  };
  this.edit = (evt, row, index) => {
    self.error.value = "";
    Object.assign(self.record, {});
    if (row.sourceId) {
      const rec = store.records.find((r) => r.id === row.sourceId);
      Object.assign(self.record, rec);
    } else {
      Object.assign(self.record, row);
    }
    self.editing.value = true;
  };
  this.save = () => {
    self.error.value = store.set(self.record);
    self.editing.value = self.error.value != "";
  };
  this.clear = function (recs) {
    const appStore = useAppStore();
    let message = `Are you sure you want to delete ${
      recs ? "these" : "ALL"
    } ${modelTitle.toLowerCase()}?`;
    if (appStore.needsBackup)
      message += "  NOTE: You currently need to back up your data.";
    $q.dialog({
      title: "Confirm",
      message,
      cancel: true,
      persistent: true,
    }).onOk(() => {
      store.clear(recs);
    });
  };
  this.remove = function () {
    $q.dialog({
      title: "Confirm",
      message: "Are you sure you want to delete this record?",
      cancel: true,
      persistent: true,
    }).onOk(() => {
      self.error.value = "";
      store.delete(self.record.sourceId ?? self.record.id);
      self.editing.value = false;
    });
  };
  this.error = ref("");
  this.editing = ref(false);
  this.record = reactive({});
  this.title = ref(modelTitle);
}

export default Repo;
