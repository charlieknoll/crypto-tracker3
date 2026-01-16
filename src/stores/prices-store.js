import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { useAppStore } from "./app-store";
import { Notify, date } from "quasar";
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
import { timestampToTime } from "src/utils/date-helper";
import { onlyUnique } from "src/utils/array-helpers";
import { parseCommaFloat } from "src/utils/number-helpers";

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
const mapAssetDates = (r, fieldName) => {
  return r.map((r) => {
    return {
      date: r.date,
      asset: r[fieldName],
    };
  });
};
const pricesFromHashes = function (hashes, tokenTxs) {
  //first calc prices for baseCurrency containing txs where tx.price = 0.0
  const calcPrices = [];
  for (let i = 0; i < hashes.length; i++) {
    const hash = hashes[i];
    let hashTxs = tokenTxs.filter((tx) => tx.hash == hash);
    let sellCt = 0;
    let buyCt = 0;
    let sellGross = 0.0;
    let buyGross = 0.0;
    hashTxs.map((tx) => {
      if (tx.taxCode == "BUY") {
        buyGross += tx.amount * tx.price;
        buyCt += tx.amount > 0.0 ? 1 : 0;
      } else {
        sellGross += tx.amount * tx.price;
        sellCt += tx.amount > 0.0 ? 1 : 0;
      }
    });
    hashTxs.map((tx) => {
      if (tx.price == 0.0) {
        let price = 0.0;

        if (tx.taxCode == "BUY") {
          price = sellGross / buyCt / tx.amount;
        } else {
          price = buyGross / sellCt / tx.amount;
        }
        calcPrices.push({
          price,
          asset: tx.asset,
          timestamp: tx.timestamp,
          date: tx.date,
          time: timestampToTime(tx.timestamp),
          source: "Calc",
        });
      }
    });
  }
  calcPrices.map((p) => (p.id = keyFunc(p)));
  return calcPrices;
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
      upserted.price = parseCommaFloat(upserted.price);
      if (upserted.date && upserted.time) {
        upserted.timestamp =
          new Date(upserted.date + " " + upserted.time).getTime() / 1000;
      } else if (upserted.timestamp) {
        upserted.time = date.formatDate(upserted.timestamp * 1000, "HH:mm:ss");
        upserted.date = date.formatDate(
          upserted.timestamp * 1000,
          "YYYY-MM-DD"
        );
      }
      let errorMessage = validate(upserted, requiredFields);

      if (errorMessage) return errorMessage;

      let record = this.records.find((r) => {
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

      if (dup) {
        record = dup;
      }

      upserted.id = keyFunc(upserted);
      if (!upserted.timestamp) {
        upserted.timestamp = getTimestamp(upserted.date + "T" + upserted.time);
      }

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
          r.asset == asset.toUpperCase() &&
          r.timestamp == timestamp &&
          (r.source == "Manual" || r.source == "Calc")
      );
      if (result) {
        return result.price;
      }
      if (!date && timestamp) {
        const dt = timestampToDateAndTime(timestamp);
        date = dt.date;
      }
      result = this.records.find(
        (r) => r.asset == asset && r.date == date && r.source == "Manual"
      );
      if (result) {
        return result.price;
      }
      //return the closest calc'd using timestamp
      result = this.records.filter(
        (r) => r.asset == asset && r.date == date && r.source == "Calc"
      );
      if (result.length > 0) {
        result.sort((a, b) =>
          Math.abs(a.timestamp - timestamp) > Math.abs(b.timestamp - timestamp)
            ? 1
            : -1
        );
        return result[0].price;
      }

      result = this.records.find(
        (r) => r.asset == asset && r.date == date && r.source != "Manual"
      );
      if (result) return result.price;

      const settings = useSettingsStore();

      const baseCurrencies = settings.baseCurrencies
        .split(",")
        .map((bc) => bc.trim());

      if (baseCurrencies.indexOf(asset) > -1) return 1.0;

      return 0.0;
    },
    getMostRecentPrice(asset) {
      const result = this.records.filter(
        (r) => r.asset == asset && r.price != 0.0
      );
      if (result.length > 0) {
        result.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
        return result[0];
      }
      return { price: 0.0 };
    },
    calcPrices() {
      const settings = useSettingsStore();

      const baseCurrencies = settings.baseCurrencies
        .split(",")
        .map((bc) => bc.trim());
      //get tokenTxs
      const txStore = useChainTxsStore();
      let tokenTxs = txStore.accountTxs.filter(
        (tx) =>
          tx.txType == "T" && (tx.taxCode == "BUY" || tx.taxCode == "SELL")
      );

      let baseParentHashes = tokenTxs
        .filter((tx) => baseCurrencies.indexOf(tx.asset) > -1)
        .map((tx) => tx.hash);
      //filter out baseParentHashes with no zero price tx's

      baseParentHashes = baseParentHashes
        .filter(
          (h) =>
            tokenTxs.filter((tx) => tx.hash == h && tx.price == 0.0).length > 0
        )
        .filter(onlyUnique);
      let prices = pricesFromHashes(baseParentHashes, tokenTxs);
      this.savePrices(prices);
      tokenTxs = txStore.accountTxs.filter(
        (tx) =>
          tx.txType == "T" && (tx.taxCode == "BUY" || tx.taxCode == "SELL")
      );

      let parentHashes = tokenTxs
        .filter((tx) => tx.price == 0.0)
        .map((tx) => tx.hash)
        .filter(onlyUnique);
      let parentHashesCt = 0;
      while (parentHashesCt != parentHashes.length) {
        parentHashesCt = parentHashes.length;
        prices = pricesFromHashes(parentHashes, tokenTxs);
        this.savePrices(prices);
        tokenTxs = txStore.accountTxs.filter(
          (tx) =>
            tx.txType == "T" && (tx.taxCode == "BUY" || tx.taxCode == "SELL")
        );
        parentHashes = tokenTxs
          .filter((tx) => tx.price == 0.0)
          .map((tx) => tx.hash)
          .filter(onlyUnique);
      }

      //then derive more prices until calc'd prices are exausted
    },
    savePrices(prices) {
      const app = useAppStore();
      const recs = JSON.parse(JSON.stringify(this.records));
      const added = prices.filter((p) => {
        return (
          this.records.findIndex((ep) => {
            return (
              p.asset == ep.asset &&
              p.timestamp == ep.timestamp &&
              ep.source == p.source
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
      console.log("Getting prices...DISABLED");
      return;
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

      // trackedCurrencies.push(
      //   ...settings.additionalTrackedCurrencies.split(",").map((c) => c.trim())
      // );

      //build list of date/prices (coingecko doesn't support timestamps)

      let prices = mapAssetDates(exchangeTrades.records, "currency");
      prices = prices.concat(
        mapAssetDates(exchangeTrades.records, "feeCurrency")
      );
      prices = prices.concat(
        mapAssetDates(offchainTransfers.records, "feeCurrency")
      );

      prices = prices.concat(mapAssetDates(chainTxs.accountTxs, "asset"));

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
              p.asset == ep.asset && p.date == ep.date && ep.source != "Manual"
            );
          }) == -1
        );
      });

      //get remaining prices
      const self = this;
      for (let u = 0; u < prices.length; u++) {
        const p = prices[u];
        if (baseCurrencies.indexOf(p.asset) > -1) {
          p.price = 1.0;
          p.source = "Base";
          p.time = "00:00:00";
          p.timestamp = getTimestamp(p.date + "T" + p.time);
          p.id = keyFunc(p);
        } else {
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
      }
      this.savePrices(prices);
      this.calcPrices();
      //patch to store using repo technique

      app.importing = false;
      lock.release();
    },
  }),
});
