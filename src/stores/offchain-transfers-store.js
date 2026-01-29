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
import { usePricesStore } from "./prices-store";
import { multiplyCurrency, floatToStrAbs } from "src/utils/number-helpers";
import { useAddressStore } from "./address-store";

const keyFunc = (r) =>
  hasValue(r.transferId) ? r.transferId : getId(r, keyFields);

export const useOffchainTransfersStore = defineStore("offchain-transfers", {
  state: () => ({
    records: useLocalStorage("offchain-transfers", []),
    initValue: getInitValue(fields, useAppStore()),
  }),
  getters: {
    split(state) {
      let data = JSON.parse(JSON.stringify(state.records));
      const prices = usePricesStore();
      const addresses = useAddressStore();
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
          feeTx.type = "FEE";
          feeTx.id = tx.id + "F";
          feeTx.price = feeUSDPrice;
          feeTx.asset = tx.feeCurrency;
          feeTx.amount = tx.fee;
          feeTx.fee = usdFee;
          feeTx.feeCurrency = "USD";
          feeTx.sort = 1;
          mappedData.push(feeTx);
        } else {
          usdFee = tx.fee;
        }
        tx.sort = 0;
        //TODO lookup to account and set type accordingly
        const addresses = useAddressStore();

        const toAddress = addresses.records.find((a) => a.name == tx.toAccount);
        tx.type = "TRANSFER";
        if (toAddress && !toAddress.type.toUpperCase().includes("OWNED")) {
          tx.type = toAddress.type.toUpperCase();
        }
        tx.feeCurrency = "USD";
        tx.price = prices.getPrice(tx.asset, tx.date, tx.timestamp);
        tx.amount = floatToStrAbs(tx.amount);
        tx.fee = usdFee;
        tx.feeCurrency = "USD";
        mappedData.push(tx);
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
      upserted.time = hasValue(upserted.time) ? upserted.time : "00:00:00";
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
        const prices = usePricesStore();
        //prices.getPrices();
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
      const app = useAppStore();
      const initValue = getInitValue(fields, app);

      const mapped = stage.map((op) => {
        //fix optional default values
        let time = op.Date.substring(11, 19);
        if (!hasValue(time)) time = initValue.time;
        let feeCurrency = op.FeeCurrency;
        if (!hasValue(feeCurrency)) feeCurrency = initValue.feeCurrency;

        const tx = {
          transferId: op.Id,
          memo: op.Memo,
          date: op.Date.substring(0, 10),
          time: time,
          amount: op.Volume,
          fromAccount: op.FromAccount,
          toAccount: op.ToAccount,
          fee: hasValue(op.Fee) ? parseFloat(op.Fee) : 0.0,
          feeCurrency: feeCurrency,
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
