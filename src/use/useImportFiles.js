import { useAppStore } from "src/stores/app-store";
import { watch } from "vue";
import { processFiles } from "../services/file-handler";

export function useImportFiles(valueToWatch) {
  const refVal = valueToWatch;
  watch(valueToWatch, async (newVal) => {
    const app = useAppStore();
    const initNeedsBackup = app.needsBackup;
    if (newVal && newVal.length == 0) return;
    if (newVal && newVal.length) app.importing = true;
    await processFiles(newVal);
    app.importing = false;
    refVal.value = [];
    app.needsBackup = initNeedsBackup;
    //if (this.$store.onload) this.$store.onload();
  });
}
