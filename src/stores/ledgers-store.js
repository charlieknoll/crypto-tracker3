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
} from "src/models/ledgers";
import { multiplyCurrency, floatToStrAbs } from "src/utils/number-helpers";
import { usePricesStore } from "./prices-store";
import { sortByTimeStampThenIdThenSort } from "src/utils/array-helpers";

const keyFunc = (r) =>
  hasValue(r.ledgerId) ? r.ledgerId : getId(r, keyFields);

export const useLedgersStore = defineStore("ledgers", {
  state: () => ({
    records: useLocalStorage("ledgers", [], {
      shallow: true,
      deep: false,
    }),
    initValue: getInitValue(fields, useAppStore()),
  }),
  getters: {
    split(state) {
      let data = JSON.parse(JSON.stringify(state.records));
      const prices = usePricesStore();
      const mappedData = [];
      for (const tx of data) {
        let usdFee = 0.0;
        if (tx.feeCurrency != "USD") {
          const feeUSDPrice = prices.getPrice(
            tx.feeCurrency,
            tx.date,
            tx.timestamp
          );
          usdFee = multiplyCurrency([tx.fee, feeUSDPrice]);
          const feeTx = Object.assign({}, tx);
          feeTx.action = "SELL";
          feeTx.displayId = "F-" + tx.id.substring(0, 12);
          feeTx.price = feeUSDPrice;
          feeTx.asset = tx.feeCurrency;
          feeTx.amount = tx.fee;
          feeTx.fee = 0.0;
          feeTx.feeCurrency = "USD";
          feeTx.currency = tx.feeCurrency;
          feeTx.net = multiplyCurrency([feeTx.amount, feeTx.price]);
          feeTx.gross = feeTx.net;
          if (tx.feeCurrency != tx.asset) {
            feeTx.sort = -1;
          } else {
            feeTx.sort = tx.action == "BUY" ? 1 : -1;
          }
          mappedData.push(feeTx);
        } else {
          usdFee = tx.fee;
        }
        tx.feeCurrency = "USD";

        if (tx.currency != "USD") {
          const currencyUSDPrice = prices.getPrice(
            tx.currency,
            tx.date,
            tx.timestamp
          );
          if (!currencyUSDPrice)
            throw new Error(
              `${tx.currency} price needed on ${tx.date} to calculate non USD BUY/SELL`
            );

          const currencyPrice = tx.price;

          const currencyAmount =
            tx.gross ?? multiplyCurrency([tx.amount, tx.price]);
          tx.sort = 0;
          tx.price = currencyPrice * currencyUSDPrice;
          tx.fee = tx.action == "SELL" ? usdFee : 0.0;
          tx.gross = multiplyCurrency([tx.amount, tx.price]);
          tx.net = tx.gross - tx.fee;
          tx.displayId =
            (tx.action == "SELL" ? "S" : "B") + "-" + tx.id.substring(0, 12);
          tx.amount = floatToStrAbs(tx.amount);
          const currencyTx = Object.assign({}, tx);
          currencyTx.action = tx.action == "SELL" ? "BUY" : "SELL";
          currencyTx.displayId =
            (currencyTx.action == "SELL" ? "S" : "B") +
            "-" +
            tx.id.substring(0, 12);
          currencyTx.sort = -2;
          currencyTx.price = currencyUSDPrice;
          currencyTx.asset = tx.currency;
          currencyTx.amount = currencyAmount;
          currencyTx.fee = usdFee;
          currencyTx.gross = multiplyCurrency([
            currencyTx.price,
            currencyTx.amount,
          ]);
          currencyTx.net = currencyTx.gross - currencyTx.fee;
          mappedData.push(tx);
          mappedData.push(currencyTx);
        } else {
          tx.displayId =
            (tx.action == "SELL" ? "S" : "B") + "-" + tx.id.substring(0, 12);
          tx.sort = -2;
          tx.amount = floatToStrAbs(tx.amount);
          tx.fee = usdFee;
          tx.gross = multiplyCurrency([tx.amount, tx.price]);
          tx.net = tx.gross + (tx.action == "SELL" ? -tx.fee : tx.fee);
          tx.feeCurrency = "USD";
          mappedData.push(tx);
        }
      }
      return mappedData;
    },
    sortedSplit(state) {
      return this.split.sort(sortByTimeStampThenIdThenSort);
    },
    trades(state) {
      return JSON.parse(JSON.stringify(state.records)).sort(
        sortByTimeStampThenIdThenSort
      );
    },
  },
  actions: {
    set(upserted, recs) {
      let existing = recs ?? this.records;

      let errorMessage = validate(upserted, requiredFields);

      if (errorMessage) return errorMessage;
      const record = existing.find((r) => {
        return r.id == upserted.id;
      });
      upserted = setUpperCase(upserted, upperCaseFields);
      let dup;
      if ((record && upserted.id != keyFunc(upserted)) || !record) {
        dup = existing.find((r) => {
          return r.id == keyFunc(upserted);
        });
      }

      if (dup) return "Duplicate record";

      upserted.id = keyFunc(upserted);
      upserted.timestamp = getTimestamp(upserted.date + "T" + upserted.time);
      if (!record) {
        this.records = [...existing, upserted];
      } else {
        this.records = existing.map((r) => {
          if (upserted.id === r.id) {
            return Object.assign(r, upserted);
          }
          return r;
        });
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
          throw new Error("Invalid action in ledger data.");
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

        const ledgerId = hasValue(op.LedgerId) ? op.LedgerId : uid();
        const tx = {
          action,
          memo: op.Memo,
          price: gross / parseFloat(op.Volume),
          currency,
          date: dateStr.substring(0, 10),
          time: dateStr.substring(11, 19),
          ledgerId,
          amount: parseFloat(op.Volume),
          account,
          fee: parseFloat(op.Fee),
          feeCurrency,
          asset: op.Symbol,
          gross,
          net,
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
