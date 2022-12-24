import { defineStore } from "pinia";
import { parse } from "csv-parse/browser/esm/sync";
import { useLocalStorage } from "@vueuse/core";
import { useAppStore } from "./app-store";
import { uid, date } from "quasar";
const { addToDate } = date;
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
import { usePricesStore } from "./prices-store";
import { importCbpTrades } from "src/services/coinbase-provider";

const keyFunc = (r) =>
  hasValue(r.exchangeId) ? r.exchangeId : getId(r, keyFields);

export const useExchangeTradesStore = defineStore("exchange-trades", {
  state: () => ({
    records: useLocalStorage("exchange-trades", []),
    fees: useLocalStorage("exchange-fees", []),
    importedTrades: useLocalStorage("imported-trades", []),
    initValue: getInitValue(fields, useAppStore()),
  }),
  getters: {
    split(state) {
      let data = JSON.parse(JSON.stringify(state.records));
      const prices = usePricesStore();
      const mappedData = [];
      for (const tx of data) {
        //a nonUSD fee tx will always be a sell
        //first get USDfee
        let usdFee = 0.0;
        tx.sourceId = tx.id;
        if (tx.feeCurrency != "USD") {
          const feeUSDPrice = prices.getPrice(
            tx.feeCurrency,
            tx.date,
            tx.timestamp
          );
          usdFee = multiplyCurrency([tx.fee, feeUSDPrice]);
          const feeTx = Object.assign({}, tx);
          feeTx.action = "FEE";
          feeTx.id = tx.id + "F";
          feeTx.price = feeUSDPrice;
          feeTx.asset = tx.feeCurrency;
          feeTx.amount = tx.fee;
          feeTx.fee = 0.0;
          feeTx.feeCurrency = "USD";
          feeTx.currency = tx.feeCurrency;
          feeTx.net = multiplyCurrency([feeTx.amount, feeTx.price]);
          feeTx.sort = 1;
          // if (feeTx.amount != 0.0)
          mappedData.push(feeTx);
        } else {
          usdFee = tx.fee;
        }
        tx.feeCurrency = "USD";

        if (tx.currency != "USD") {
          //split into a BUY/SELL pair of txs
          const currencyUSDPrice = prices.getPrice(
            tx.currency,
            tx.date,
            tx.timestamp
          );
          const currencyPrice = tx.price;
          const id = tx.id;
          tx.sort = tx.action == "BUY" ? 2 : 0;
          tx.price = currencyPrice * currencyUSDPrice;
          tx.fee = tx.action == "SELL" ? usdFee : 0.0;
          tx.net = multiplyCurrency([tx.amount, tx.price]) - tx.fee; //fee only non-zero for sell
          tx.id = id + (tx.action == "SELL" ? "S" : "B");

          const currencyTx = Object.assign({}, tx);
          currencyTx.action = tx.action == "SELL" ? "BUY" : "SELL";
          currencyTx.id = id + (currencyTx.action == "SELL" ? "S" : "B") + id;
          currencyTx.sort = currencyTx.action == "BUY" ? 2 : 0;
          currencyTx.price = currencyUSDPrice;
          currencyTx.asset = tx.currency;
          currencyTx.amount = tx.amount * currencyPrice;
          currencyTx.fee = currencyTx.action == "SELL" ? usdFee : 0.0;
          currencyTx.net =
            multiplyCurrency([currencyTx.price, currencyTx.amount]) -
            currencyTx.fee;
          mappedData.push(tx);
          mappedData.push(currencyTx);
        } else {
          tx.amount = Math.abs(tx.amount);
          tx.fee = usdFee;
          tx.net = multiplyCurrency([tx.amount, tx.price]);
          tx.net = tx.net + (tx.action == "SELL" ? -tx.fee : tx.fee);
          tx.feeCurrency = "USD";
          mappedData.push(tx);
        }
      }
      return mappedData.sort((a, b) => {
        if (a.timestamp != b.timestamp) return a.timestamp - b.timestamp;
        if (a.sourceId != b.sourceId) return a.sourceId < b.sourceId ? 1 : -1;
        return a.sort - b.sort;
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
      //if not modifying a copied array
      if (!recs) {
        const app = useAppStore();
        app.needsBackup = true;
        this.sort();
        const prices = usePricesStore();
        prices.getPrices();
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
        return a.timestamp == b.timestamp
          ? a.id > b.id
            ? 1
            : -1
          : a.timestamp - b.timestamp;
      });
    },
    async load(data, offsets) {
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
        const offset = offsets.find((o) => o.account == op.Account);
        let dateStr = op.Date;
        if (offset) {
          const newDate = addToDate(new Date(dateStr.substring(0, 19)), {
            hours: offset.offset,
          });
          dateStr = date.formatDate(newDate, "YYYY-MM-DDTHH:mm:ss.SSSZ");
        }
        const feeCurrency = (
          hasValue(op.FeeCurrency) ? op.FeeCurrency : op.Currency
        ).toUpperCase();
        const currency = op.Currency.toUpperCase();
        let fee = parseFloat(op.Fee);
        let net = parseFloat(op["Cost/Proceeds"]);
        let gross = net;
        if (feeCurrency == currency) {
          gross += action == "SELL" ? fee : -fee;
        }

        const exchangeId = hasValue(op.ExchangeId) ? op.ExchangeId : uid();
        const tx = {
          action,
          memo: op.Memo,
          price: gross / parseFloat(op.Volume),
          currency,
          date: dateStr.substring(0, 10),
          time: dateStr.substring(11, 19),
          exchangeId,
          amount: parseFloat(op.Volume),
          account,
          fee: parseFloat(op.Fee),
          feeCurrency,
          asset: op.Symbol,
          gross,
          net,
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
    async importCbp() {
      const app = useAppStore();
      app.importing = true;
      const result = await importCbpTrades();
      if (result == -1) {
        app.importing = false;
        return;
      }
      const recs = JSON.parse(JSON.stringify(this.records));
      //const recs = this.records;

      for (let i = 0; i < result.trades.length; i++) {
        const op = result.trades[i];
        op.id = keyFunc(op);
        const errorMsg = this.set(op, recs);
        if (errorMsg != "")
          throw new Error(
            errorMsg.replace("<br>", ", ") + " on row " + (i + 1)
          );
      }
      this.fees = result.fees;
      this.importedTrades = result.trades;
      this.records = recs;
      app.importing = false;
      this.sort();
    },
  },
});
