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
import { getPrice } from "src/services/price-provider";

const keyFunc = (r) =>
  hasValue(r.exchangeId) ? r.exchangeId : getId(r, keyFields);

export const useExchangeTradesStore = defineStore("exchange-trades", {
  state: () => ({
    records: useLocalStorage("exchange-trades", []),
    initValue: getInitValue(fields, useAppStore()),
  }),
  getters: {
    split(state) {
      let data = JSON.parse(JSON.stringify(state.records));
      const mappedData = [];
      for (const tx of data) {
        //a nonUSD fee tx will always be a sell
        //first get USDfee
        let usdFee = 0.0;
        if (tx.feeCurrency != "USD") {
          const feeUSDPrice = getPrice(tx.feeCurrency, tx.date);
          usdFee = multiplyCurrency([tx.fee, feeUSDPrice]);
          const feeTx = Object.assign({}, tx);
          feeTx.action = "SELL";
          feeTx.id = "F-" + tx.id;
          feeTx.price = feeUSDPrice;
          feeTx.asset = tx.feeCurrency;
          feeTx.amount = tx.fee;
          feeTx.fee = 0.0;
          feeTx.feeCurrency = "USD";
          feeTx.currency = "USD";
          feeTx.net = multiplyCurrency([feeTx.amount, feeTx.price]);
          mappedData.push(feeTx);
        } else {
          usdFee = tx.fee;
        }
        tx.feeCurrency = "USD";
        tx.fee = usdFee;
        if (tx.currency != "USD") {
          const currencyUSDPrice = getPrice(tx.currency, tx.date);
          const currencyPrice = tx.price;
          const id = tx.id;
          const timestamp = tx.timestamp;

          tx.price = currencyPrice * currencyUSDPrice;
          tx.net = multiplyCurrency([tx.amount, tx.price]);
          tx.id = (tx.action == "SELL" ? "S-" : "B-") + id;
          tx.timestamp = timestamp + (tx.action == "BUY" ? 1 : 0);
          tx.fee = tx.action == "SELL" ? usdFee : 0.0;
          const currencyTx = Object.assign({}, tx);
          currencyTx.action = tx.action == "SELL" ? "BUY" : "SELL";
          currencyTx.id = (currencyTx.action == "SELL" ? "S-" : "B-") + id;
          currencyTx.timestamp =
            timestamp + (currencyTx.action == "BUY" ? 1 : 0);
          currencyTx.price = currencyUSDPrice;
          currencyTx.asset = tx.currency;
          currencyTx.amount = tx.amount * currencyPrice;
          currencyTx.net = currencyTx.price * currencyTx.amount;
          currencyTx.fee = currencyTx.action == "SELL" ? usdFee : 0.0;
          if (tx.action == "SELL") {
            mappedData.push(tx);
            mappedData.push(currencyTx);
          } else {
            mappedData.push(currencyTx);
            mappedData.push(tx);
          }
        } else {
          tx.id = (tx.action == "SELL" ? "S-" : "B-") + tx.id;
          tx.amount = Math.abs(tx.amount);
          tx.net = multiplyCurrency([tx.amount, tx.price]);
          tx.fee = usdFee;
          tx.feeCurrency = "USD";
          mappedData.push(tx);
        }
      }
      return mappedData.sort((a, b) => {
        if (a.timestamp != b.timestamp) return a - b;
        return a.exchangeId < b.exchangeId ? 1 : -1;
      });
    },
  },
  actions: {
    set(upserted, recs) {
      const existing = recs ?? this.records;
      //TODO convert to vuelidate pattern and use addressfields

      let errorMessage = validate(upserted, requiredFields);

      if (errorMessage) return errorMessage;
      const record = existing.find((r) => {
        return r.id == upserted.id;
      });
      upserted = setUpperCase(upserted, upperCaseFields);
      let dup;
      //Look for duplicate key if composite key updated or inserting
      if ((record && upserted.id != keyFunc(upserted)) || !record) {
        dup = existing.find((r) => {
          return r.id == keyFunc(upserted);
        });
      }

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
