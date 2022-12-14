import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { useAppStore } from "./app-store";
import { Notify } from "quasar";
import {
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
import StoreHelper from "src/utils/store-helpers";
import { useChainTxsStore } from "./chain-txs-store";

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

  actions: Object.assign(StoreHelper, {
    set(upserted, recs) {
      const app = useAppStore();
      upserted.source = "Manual";

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
      this.getPrices();
      return "";
    },
    // delete(id) {
    //   this.records = this.records.filter((r) => r.id != id);
    // },
    clear(deletePrices) {
      const app = useAppStore();
      app.needsBackup = true;
      if (!deletePrices) {
        this.records = [];
        return;
      }
      const recs = JSON.parse(JSON.stringify(this.records));

      const notDeleted = this.records.filter(
        (ep) => !deletePrices.includes(ep)
      );
      this.records = notDeleted;
    },
    // sort() {
    //   this.records = this.records.sort((a, b) => {
    //     return a.timestamp - b.timestamp;
    //   });
    // },
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

      //TODO return base currency = 1.0

      //TODO calc implied?

      return 0.0;
    },
    savePrices(prices) {
      const app = useAppStore();
      const recs = JSON.parse(JSON.stringify(this.records));
      const added = prices.filter((p) => {
        return (
          this.records.findIndex((ep) => {
            return (
              p.asset == ep.asset && p.date == ep.date && ep.source == "Api"
            );
          }) == -1 && p.id
        );
      });

      this.records = recs.concat(added);
      if (added.length) showPriceDialog(added.length);
      app.needsBackup = true;
      this.sort();
    },
    async getPrices() {
      await lock.acquire();
      const app = useAppStore();
      app.importing = true;
      const exchangeTrades = useExchangeTradesStore();
      const offchainTransfers = useOffchainTransfersStore();
      const chainTxs = useChainTxsStore();

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
      prices = prices.concat(
        mapAssetDates(baseCurrencies, chainTxs.accountTxs, "asset")
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
      const self = this;
      for (let u = 0; u < prices.length; u++) {
        const p = prices[u];
        p.price = await getApiPrice(p.asset, p.date, function () {
          app.importing = false;
          self.savePrices(prices);
        });
        app.importing = true;
        p.source = "Api";
        p.time = "00:00:00";
        p.timestamp = getTimestamp(p.date + "T" + p.time);
        p.id = keyFunc(p);
      }

      //patch to store using repo technique
      this.savePrices(prices);
      app.importing = false;
      lock.release();
    },
  }),
});
