import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { useAppStore } from "./app-store";
import { Notify } from "quasar";
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
import { useSettingsStore } from "./settings-store";
import { useExchangeTradesStore } from "./exchange-trades-store";
import Semaphore from "semaphore-async-await";
import { getApiPrice } from "src/services/price-provider";
import { useOffchainTransfersStore } from "./offchain-transfers-store";
const lock = new Semaphore(1);
const keyFunc = (r) => getId(r, keyFields);

const showPriceDialog = function (count) {
  Notify.create({
    group: false, // required to be updatable
    timeout: 4000, // we want to be in control when it gets dismissed
    spinner: false,
    message: `${count} prices retrieved.`,
    color: "green",
  });
};
const mapAssetDates = (baseCurrencies, r, fieldName) => {
  return r
    .filter((r) => baseCurrencies.findIndex((bc) => bc == r[fieldName]) == -1)
    .map((r) => {
      return {
        date: r.date,
        asset: r[fieldName],
      };
    });
};
export const usePricesStore = defineStore("prices", {
  state: () => ({
    records: useLocalStorage("prices", []),
    initValue: getInitValue(fields, useAppStore()),
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

      upserted.source = "Manual";
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
      this.getPrices();
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
    getPrice(asset, date, timestamp) {
      ///use manual with exact timestamp first
      ///then date from api

      let result = this.records.find(
        (r) =>
          r.asset == asset && r.timestamp == timestamp && r.source == "Manual"
      );
      if (result) {
        return result.price;
      }
      result = this.records.find(
        (r) => r.asset == asset && r.date == date && r.source == "Api"
      );
      if (result) return result.price;

      return 0.0;
    },
    async getPrices() {
      await lock.acquire();
      const app = useAppStore();
      app.importing = true;
      const exchangeTrades = useExchangeTradesStore();
      const offchainTransfers = useOffchainTransfersStore();

      const settings = useSettingsStore();

      const baseCurrencies = settings.baseCurrencies
        .split(",")
        .map((bc) => bc.trim());

      //build list of date/prices (coingecko doesn't support timestamps)

      let prices = mapAssetDates(
        baseCurrencies,
        exchangeTrades.records,
        "currency"
      );
      prices = prices.concat(
        mapAssetDates(baseCurrencies, exchangeTrades.records, "feeCurrency")
      );
      prices = prices.concat(
        mapAssetDates(baseCurrencies, offchainTransfers.records, "feeCurrency")
      );

      //make unique
      prices = prices.filter(function (value, index, self) {
        return (
          self.findIndex((p) => {
            return p.asset == value.asset && p.date == value.date;
          }) === index
        );
      });
      //filter out already retrieved prices
      prices = prices.filter((p) => {
        return (
          this.records.findIndex((ep) => {
            return (
              p.asset == ep.asset && p.date == ep.date && ep.source == "Api"
            );
          }) == -1
        );
      });

      //get remaining prices

      for (let u = 0; u < prices.length; u++) {
        const p = prices[u];
        p.price = await getApiPrice(p.asset, p.date);
        p.source = "Api";
        p.time = "00:00:00";
        p.timestamp = getTimestamp(p.date + "T" + p.time);
        p.id = keyFunc(p);
      }

      //patch to store using repo technique
      const recs = JSON.parse(JSON.stringify(this.records));
      //const recs = this.records;

      // for (let i = 0; i < prices.length; i++) {
      //   const op = prices[i];
      //   op.id = keyFunc(op);
      //   const errorMsg = this.set(op, recs);
      //   if (errorMsg != "") console.error("Duplicate or invalid price:" + op);
      // }
      // debugger;
      this.records = recs.concat(prices);
      if (prices.length) showPriceDialog(prices.length);
      //console.log("Prices downloaded: " + prices.length);
      app.needsBackup = true;
      this.sort();
      app.importing = false;
      lock.release();
      //console.log(prices);
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
