import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { useAppStore } from "./app-store";

import { hasValue, getInitValue } from "src/utils/model-helpers";
import chainFields from "src/models/chain";
const keyFunc = (r) => r.symbol;

export const useChainStore = defineStore("chains", {
  state: () => ({
    records: useLocalStorage("chains", []),
    initValue: getInitValue(chainFields),
  }),
  getters: {
    chains: (state) => state.records.map((r) => r.symbol).sort(),
  },
  actions: {
    set(upserted) {
      const app = useAppStore();
      let errorMessage = "";
      if (!hasValue(upserted.name)) errorMessage += "Name is required<br>";
      if (!hasValue(upserted.symbol)) errorMessage += "Symbol is required<br>";
      if (errorMessage) return errorMessage;
      const record = this.records.find((r) => {
        return r.id == upserted.id;
      });

      let dup;
      //Look for duplicate key if composite key updated or inserting
      if ((record && upserted.id != keyFunc(upserted)) || !record) {
        dup = this.records.find((r) => {
          return r.id == keyFunc(upserted);
        });
      }

      if (dup) return "Duplicate chain record";

      upserted.id = keyFunc(upserted);
      if (!record) {
        this.records.push(Object.assign({}, upserted));
      } else {
        Object.assign(record, upserted);
      }

      app.needsBackup = true;
      return "";
    },
    delete(id) {
      this.records = this.records.filter((r) => r.id != id);
    },
  },
});
