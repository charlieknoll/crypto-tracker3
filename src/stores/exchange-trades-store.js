import { defineStore } from "pinia";
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
} from "src/models/exchange-trades";
import { multiplyCurrency } from "src/utils/number-helpers";

const keyFunc = (r) =>
  hasValue(r.exchangeId) ? r.exchangeId : getId(r, keyFields);

export const useExchangeTradesStore = defineStore("exchange-trades", {
  state: () => ({
    records: useLocalStorage("exchange-trades", []),
    initValue: getInitValue(fields),
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
      upserted.timestamp = getTimestamp(upserted.date);
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
      const mapped = stage.map((op) => {
        const action = op.Action.toUpperCase();
        if (!(action == "SELL" || action == "BUY")) {
          throw new Error("Invalid action in trade data.");
        }
        const account = op.Account == "" ? op.Memo : op.Account;
        const feeCurrency = (
          hasValue(op.FeeCurrency) ? op.FeeCurrency : op.Currency
        ).toUpperCase();
        const tx = {
          action,
          timestamp: getTimestamp(op.Date),
          memo: op.Memo,
          price: parseFloat(op.Price),
          currency: op.Currency.toUpperCase(),
          date: op.Date.substring(0, 10),
          exchangeId: op.ExchangeId,
          amount: parseFloat(op.Volume),
          account,
          fee: parseFloat(op.Fee),
          feeCurrency,
          asset: op.Symbol,
          cost: multiplyCurrency(op.Price, op.Volume),
        };
        return tx;
        //return { action, account };
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
        //TODO set key id to allow reimport of data
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
