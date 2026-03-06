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
import {
  multiplyCurrency,
  floatToStr,
  floatToStrAbs,
  currency,
} from "src/utils/number-helpers";
import { usePricesStore } from "./prices-store";
import { importCbpTrades } from "src/services/coinbase-provider";
import { getTradeHistory } from "src/services/kraken-provider";
import { sortByTimeStampThenIdThenSort } from "src/utils/array-helpers";

const keyFunc = (r) =>
  hasValue(r.exchangeId) ? r.exchangeId : getId(r, keyFields);

const normalizeKrakenAsset = (asset) => {
  if (!asset) return "";
  const value = asset.toString().toUpperCase().split(".")[0];
  const map = {
    XXBT: "BTC",
    XBT: "BTC",
    XETH: "ETH",
    ETH2: "ETH",
    XXDG: "DOGE",
    XDG: "DOGE",
    ZUSD: "USD",
    ZEUR: "EUR",
    ZGBP: "GBP",
    ZCAD: "CAD",
    ZAUD: "AUD",
    ZUSDT: "USDT",
  };
  if (map[value]) return map[value];
  if (value.length === 4 && (value.startsWith("X") || value.startsWith("Z"))) {
    return value.substring(1);
  }
  return value;
};

const parseKrakenPair = (pair) => {
  if (!pair) return { asset: "", currency: "USD" };
  const cleaned = pair.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const normalized = cleaned
    .replace(/XXBT/g, "BTC")
    .replace(/XBT/g, "BTC")
    .replace(/XETH/g, "ETH")
    .replace(/XXDG/g, "DOGE")
    .replace(/XDG/g, "DOGE")
    .replace(/ZUSD/g, "USD")
    .replace(/ZEUR/g, "EUR")
    .replace(/ZGBP/g, "GBP")
    .replace(/ZCAD/g, "CAD")
    .replace(/ZAUD/g, "AUD")
    .replace(/ZUSDT/g, "USDT");

  const quotes = [
    "USDT",
    "USDC",
    "USD",
    "EUR",
    "GBP",
    "CAD",
    "AUD",
    "BTC",
    "ETH",
  ];
  for (const quote of quotes) {
    if (normalized.endsWith(quote) && normalized.length > quote.length) {
      const base = normalized.substring(0, normalized.length - quote.length);
      return {
        asset: normalizeKrakenAsset(base),
        currency: normalizeKrakenAsset(quote),
      };
    }
  }

  if (pair.includes("/") || pair.includes("-")) {
    const delim = pair.includes("/") ? "/" : "-";
    const [base, quote] = pair.split(delim);
    return {
      asset: normalizeKrakenAsset(base),
      currency: normalizeKrakenAsset(quote),
    };
  }

  return {
    asset: normalizeKrakenAsset(normalized.substring(0, 3)),
    currency: normalizeKrakenAsset(normalized.substring(3)),
  };
};

const mapKrakenTrade = (tradeId, trade, accountName) => {
  const { asset, currency } = parseKrakenPair(trade.pair);
  const action = (trade.type ?? "BUY").toUpperCase();
  const amount = parseFloat(trade.vol ?? 0.0);
  const fee = parseFloat(trade.fee ?? 0.0);
  const net = parseFloat(trade.cost ?? 0.0);
  let gross = net;
  if (currency && currency === normalizeKrakenAsset(currency)) {
    gross += action == "SELL" ? fee : -fee;
  }
  const timestampMs = Math.floor(parseFloat(trade.time ?? 0.0) * 1000);
  const tradeDate = new Date(timestampMs);
  const memo = [trade.ordertype, trade.pair]
    .filter((v) => hasValue(v))
    .join(" ");

  return {
    action,
    memo,
    price: parseFloat(trade.price ?? 0.0),
    currency,
    date: date.formatDate(tradeDate, "YYYY-MM-DD"),
    time: date.formatDate(tradeDate, "HH:mm:ss"),
    exchangeId: tradeId,
    id: tradeId,
    amount,
    account: accountName,
    fee,
    feeCurrency: currency,
    asset,
    gross,
    net,
  };
};

export const useExchangeTradesStore = defineStore("exchange-trades", {
  state: () => ({
    records: useLocalStorage("exchange-trades", [], {
      shallow: true,
      deep: false,
    }),
    fees: useLocalStorage("exchange-fees", [], {
      shallow: true,
      deep: false,
    }),
    importedTrades: useLocalStorage("imported-trades", [], {
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
        //a nonUSD fee tx will always be a sell
        //first get USDfee
        let usdFee = 0.0;
        //tx.sourceId = tx.id;
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
          if (!currencyUSDPrice) {
            console.error(
              `${tx.currency} price needed on ${tx.date} to calculate non USD BUY/SELL`
            );
          }

          const currencyPrice = tx.price;

          const currencyAmount =
            tx.gross ?? multiplyCurrency([tx.amount, tx.price]);
          tx.sort = 0;
          //tx.sort = tx.action == "BUY" ? 2 : 0;
          tx.price =
            currencyPrice != 0.0
              ? currencyPrice * currencyUSDPrice
              : (tx.gross / tx.amount) * currencyUSDPrice;
          tx.fee = tx.action == "SELL" ? usdFee : 0.0;
          tx.gross = multiplyCurrency([tx.amount, tx.price]);
          tx.net = tx.gross - tx.fee; //fee only non-zero for sell
          tx.displayId =
            (tx.action == "SELL" ? "S" : "B") + "-" + tx.id.substring(0, 12);
          tx.amount = floatToStrAbs(tx.amount);
          const currencyTx = Object.assign({}, tx);
          currencyTx.action = tx.action == "SELL" ? "BUY" : "SELL";
          //currencyTx.id = id;
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
        this.records = [...existing, upserted];
        //existing.push(Object.assign({}, upserted));
      } else {
        //Object.assign(record, upserted);
        this.records = existing.map((r) => {
          if (upserted.id === r.id) {
            // Create a brand new object for this item
            return Object.assign(r, upserted);
          }
          // Return the original object for all others
          return r;
        });
      }
      //if not modifying a copied array
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
    async importKrakenTradeHistory(params = {}, accountName = "Kraken") {
      const app = useAppStore();
      app.importing = true;
      app.importingMessage = "Importing Kraken trade history...";
      try {
        const pageSize = parseInt(params.pageSize ?? 50);
        const queryParams = { ...params };
        delete queryParams.pageSize;
        const lastTrade = this.records
          .filter((r) => r.account == accountName)
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        if (lastTrade) {
          queryParams.start = lastTrade.timestamp;
        }
        let ofs = parseInt(queryParams.ofs ?? 0);
        let imported = 0;

        while (true) {
          const result = await getTradeHistory({
            ...queryParams,
            ofs,
          });

          const trades = result?.trades ?? {};
          const entries = Object.entries(trades);
          if (entries.length === 0) break;

          for (let i = 0; i < entries.length; i++) {
            const [tradeId, trade] = entries[i];
            const op = mapKrakenTrade(tradeId, trade, accountName);
            const errorMsg = this.set(op);
            if (errorMsg != "") {
              throw new Error(
                errorMsg.replace("<br>", ", ") +
                  " on Kraken trade id " +
                  tradeId
              );
            }
            imported++;
          }

          ofs += entries.length;
          const totalCount = parseInt(result?.count ?? 0);
          if (
            (totalCount > 0 && ofs >= totalCount) ||
            entries.length < pageSize
          ) {
            break;
          }
        }

        this.sort();
        return imported;
      } finally {
        app.importing = false;
        app.importingMessage = "";
      }
    },
  },
});
