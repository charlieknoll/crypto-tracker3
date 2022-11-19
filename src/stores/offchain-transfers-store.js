import { defineStore, acceptHMRUpdate } from "pinia";
import { parse } from "csv-parse/browser/esm/sync";
import { useLocalStorage } from "@vueuse/core";
import { useAppStore } from "./app-store";
import {
  getId,
  getInitValue,
  validate,
  getTimestamp,
  setUpperCase,
  hasValue,
} from "src/utils/model-helpers";
import {
  keyFields,
  fields,
  requiredFields,
  upperCaseFields,
} from "src/models/offchain-transfers";

const keyFunc = (r) =>
  hasValue(r.transferId) ? r.transferId : getId(r, keyFields);

export const useOffchainTransfersStore = defineStore("offchain-transfers", {
  state: () => ({
    records: useLocalStorage("offchain-transfers", []),
  }),
  getters: {},
  actions: {
    set(upserted, recs) {
      const existing = recs ?? this.records;
      //TODO convert to vuelidate pattern and use addressfields

      let errorMessage = validate(upserted, requiredFields);

      if (errorMessage) return errorMessage;
      const record = existing.find((r) => {
        return r.id == upserted.id;
      });

      let dup;
      //Look for duplicate key if composite key updated or inserting
      if ((record && upserted.id != keyFunc(upserted)) || !record) {
        dup = existing.find((r) => {
          return r.id == keyFunc(upserted);
        });
      }
      upserted = setUpperCase(upserted, upperCaseFields);

      if (dup) return "Duplicate record";

      upserted.id = keyFunc(upserted);
      upserted.timestamp = getTimestamp(upserted.date + "T" + upserted.time);
      if (!record) {
        existing.push(Object.assign({}, upserted));
      } else {
        Object.assign(record, upserted);
      }
      if (!recs) {
        const app = useAppStore();
        app.needsBackup = true;
        this.sort();
      }
      return "";
    },
    delete(id) {
      this.records = this.records.filter((r) => r.id != id);
    },
    clear() {
      this.records = [];
    },
    sort() {
      this.records = this.records.sort((a, b) => {
        return a.timestamp - b.timestamp;
      });
    },
    async load(data) {
      const stage = parse(data, {
        trim: true,
        columns: true,
        skip_empty_lines: true,
      });
      const initValue = getInitValue(fields);
      const mapped = stage.map((op) => {
        const tx = {
          transferId: op.Id,
          memo: op.Memo,
          date: op.Date.substring(0, 10),
          time: op.Date.substring(11, 19),
          amount: parseFloat(op.Volume),
          fromAccount: op.FromAccount,
          toAccount: op.ToAccount,
          fee: hasValue(op.Fee) ? parseFloat(op.Fee) : 0.0,
          feeCurrency: hasValue(op.FeeCurrency)
            ? op.FeeCurrency
            : initValue.feeCurrency,
          asset: op.Symbol,
        };

        return tx;
        //return { action, account };o
      });
      //this doesn't work, just references array
      //const recs = [...this.records];

      //this doesn't create a reactive array, but the elemnts are Proxies
      // const recs = [];
      // recs.push(...this.records);

      //this works
      const recs = JSON.parse(JSON.stringify(this.records));
      //const recs = this.records;

      for (let i = 0; i < mapped.length; i++) {
        const op = mapped[i];
        op.id = keyFunc(op);
        const errorMsg = this.set(op, recs);
        if (errorMsg != "")
          throw new Error(
            errorMsg.replace("<br>", ", ") + " on row " + (i + 1)
          );
      }
      this.records = recs;
      const app = useAppStore();
      app.needsBackup = true;
      this.sort();
      return mapped.length;
    },
  },
});
if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useOffchainTransfersStore, import.meta.hot)
  );
}
