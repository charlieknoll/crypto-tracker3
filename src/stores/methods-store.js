import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { useAppStore } from "./app-store";
import { methods } from "src/services/methods";
import { hasValue } from "src/utils/model-helpers";

export const useMethodStore = defineStore("methods", {
  state: () => ({
    records: useLocalStorage("methods", methods),
  }),

  actions: {
    set(upserted) {
      const app = useAppStore();

      //if (!hasValue(upserted.name)) return "";
      const record = this.records.find((r) => {
        return r.id == upserted.id;
      });

      if (!record) {
        this.records.push(Object.assign({}, upserted));
      } else {
        Object.assign(record, upserted);
      }

      app.needsBackup = true;
      return "";
    },
  },
  getters: {
    getMethodName: (state) => {
      return (id) => {
        if (id == "0x") return "";
        const rec = state.records.find((m) => m.id === id.substring(0, 10));
        return rec ? rec.name : "";
      };
    },
  },
});
