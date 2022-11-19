import { defineStore } from "pinia";
import { parse } from "csv-parse/browser/esm/sync";
import { useLocalStorage } from "@vueuse/core";
import { useAppStore } from "./app-store";
import {
  getId,
  getInitValue,
  validate,
  getTimestamp,
} from "src/utils/model-helpers";
import {
  keyFields,
  fields,
  requiredFields,
} from "src/models/opening-positions";
import { multiplyCurrency } from "src/utils/number-helpers";

const keyFunc = (r) => getId(r, keyFields);

export const useOpeningPositionsStore = defineStore("opening-positions", {
  state: () => ({
    records: useLocalStorage("opening-positions", []),
    initValue: getInitValue(fields),
  }),
  getters: {},
  actions: {
    set(upserted) {
      //TODO convert to vuelidate pattern and use addressfields
      const app = useAppStore();
      let errorMessage = validate(upserted, requiredFields);

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

      if (dup) return "Duplicate record";

      upserted.id = keyFunc(upserted);
      upserted.timestamp = getTimestamp(upserted.date);
      if (!record) {
        this.records.push(Object.assign({}, upserted));
      } else {
        Object.assign(record, upserted);
      }

      app.needsBackup = true;
      this.sort();
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
    async load(openingData) {
      const stageOpeningData = parse(openingData, {
        trim: true,
        columns: true,
        skip_empty_lines: true,
      });
      const mappedOpeningData = stageOpeningData.map(function (op) {
        return {
          timestamp: getTimestamp(op.Date),
          memo: op.Memo,
          price: parseFloat(op.Price),
          date: op.Date.substring(0, 10),
          amount: parseFloat(op.Volume),
          account: op.Account,
          fee: parseFloat(op.Fee),
          asset: op.Symbol,
          cost: multiplyCurrency([op.Price, op.Volume]),
        };
      });
      for (let i = 0; i < mappedOpeningData.length; i++) {
        const op = mappedOpeningData[i];
        //TODO set key id to allow reimport of data
        const errorMsg = this.set(op);
        if (errorMsg != "")
          throw new Error(
            errorMsg.replace("<br>", ", ") + " on row " + (i + 1)
          );
      }
      return mappedOpeningData.length;
    },
  },
});
