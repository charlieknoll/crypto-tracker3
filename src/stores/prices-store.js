import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { useAppStore } from "./app-store";

import {
  hasValue,
  getInitValue,
  validate,
  setUpperCase,
  getId,
  getTimestamp,
} from "src/utils/model-helpers";
import {
  keyFields,
  fields,
  requiredFields,
  upperCaseFields,
} from "src/models/price";

const keyFunc = (r) => getId(r, keyFields);

export const usePricesStore = defineStore("prices", {
  state: () => ({
    records: useLocalStorage("prices", []),
    initValue: getInitValue(fields),
  }),

  actions: {
    set(upserted, recs) {
      const app = useAppStore();

      let errorMessage = validate(upserted, requiredFields);

      if (errorMessage) return errorMessage;

      const record = this.records.find((r) => {
        return r.id == upserted.id;
      });
      upserted = setUpperCase(upserted, upperCaseFields);
      let dup;
      //Look for duplicate key if composite key updated or inserting
      if ((record && upserted.id != keyFunc(upserted)) || !record) {
        dup = this.records.find((r) => {
          return r.id == keyFunc(upserted);
        });
      }

      if (dup) return "Duplicate record";

      upserted.id = keyFunc(upserted);
      upserted.timestamp = getTimestamp(upserted.date + "T" + upserted.time);
      if (!record) {
        this.records.push(Object.assign({}, upserted));
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
    async getPrices() {
      console.log("Getting prices");
    },
    load(data) {
      const stage = parse(data, {
        trim: true,
        columns: true,
        skip_empty_lines: true,
      });
      const mapped = stage.map((op) => {
        const p = {
          action,
          memo: op.Memo,
          price: parseFloat(op.Price),
          currency: op.Currency.toUpperCase(),
          date: op.Date.substring(0, 10),
          time: op.Date.substring(11, 19),
          exchangeId: op.ExchangeId,
          amount: parseFloat(op.Volume),
          account,
          fee: parseFloat(op.Fee),
          feeCurrency,
          asset: op.Symbol,
          cost: multiplyCurrency(op.Price, op.Volume),
        };
        return tx;
      });

      const recs = JSON.parse(JSON.stringify(this.records));
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
