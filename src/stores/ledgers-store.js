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
import { parseEther } from "ethers";
import { usePricesStore } from "./prices-store";
import { sortByTimeStampThenIdThenSort } from "src/utils/array-helpers";
import { getLedgerEntries } from "src/services/kraken-provider";
import { getPrice as getCoinDeskPrice } from "src/services/coindesk-provider";

const keyFunc = (r) =>
  hasValue(r.ledgerId) ? r.ledgerId : getId(r, keyFields);

const mapKrakenLedgerEntry = (entryId, entry, accountName) => {
  const timestamp = Math.floor(parseFloat(entry.time ?? 0) * 1000);
  const entryDate = new Date(timestamp);
  let asset = (entry.asset ?? "USD").toUpperCase();
  if (asset.includes(".F")) asset = asset.substring(0, asset.indexOf(".F"));
  if (asset == "XXBT") asset = "BTC";
  if (asset == "XETH") asset = "ETH";

  const amount = entry.amount ?? "0.0";
  const fee = entry.fee ?? "0.0";

  return {
    ledgerId: entryId,
    date: date.formatDate(entryDate, "YYYY-MM-DD"),
    time: date.formatDate(entryDate, "HH:mm:ss"),
    account: accountName,
    asset,
    action: (entry.type ?? "ADJUSTMENT").toUpperCase(),
    amount,
    price: 0.0,
    currency: "USD",
    fee,
    feeCurrency: asset,
    memo: entry.subtype ?? entry.refid ?? "",
    gross: amount,
    net: amount - fee,
  };
};

export const useLedgersStore = defineStore("ledgers", {
  state: () => ({
    records: useLocalStorage("ledgers", [], {
      shallow: true,
      deep: false,
    }),
    initValue: getInitValue(fields, useAppStore()),
  }),
  getters: {
    ledgers(state) {
      let txs = JSON.parse(JSON.stringify(state.records));
      txs = txs.map((tx) => {
        tx.biAmount = parseEther(tx.amount) - parseEther(tx.fee);

        tx.gross = multiplyCurrency([tx.amount, tx.price]);
        tx.fee = multiplyCurrency([tx.fee, tx.price]);
        return tx;
      });

      return txs.sort(sortByTimeStampThenIdThenSort);
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
    async importKrakenLedgerEntries(params = {}, accountName = "Kraken") {
      const app = useAppStore();
      app.importing = true;
      app.importingMessage = "Importing Kraken ledger entries...";
      try {
        const pageSize = parseInt(params.pageSize ?? 50);
        const queryParams = { ...params };
        delete queryParams.pageSize;
        queryParams.type = "staking";
        //get last unix timestamp of last ledger entry for this account to avoid importing duplicates
        const lastLedgerEntry = this.records
          .filter((r) => r.account == accountName)
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        if (lastLedgerEntry) {
          queryParams.start = lastLedgerEntry.timestamp - 60000;
        }

        const recs = JSON.parse(JSON.stringify(this.records));
        let ofs = parseInt(queryParams.ofs ?? 0);
        let imported = 0;

        while (true) {
          const result = await getLedgerEntries({
            ...queryParams,
            ofs,
          });

          const ledger = result?.ledger ?? {};
          const entries = Object.entries(ledger);
          if (entries.length === 0) break;

          for (let i = 0; i < entries.length; i++) {
            const [entryId, entry] = entries[i];
            if (entry.type == "transfer") continue;
            const op = mapKrakenLedgerEntry(entryId, entry, accountName);
            op.id = keyFunc(op);
            const errorMsg = this.set(op);
            if (errorMsg != "") {
              throw new Error(
                errorMsg.replace("<br>", ", ") +
                  " on Kraken ledger id " +
                  entryId
              );
            }
          }

          imported += entries.length;
          ofs += entries.length;

          const totalCount = parseInt(result?.count ?? 0);
          if (
            (totalCount > 0 && ofs >= totalCount) ||
            entries.length < pageSize
          ) {
            break;
          }
        }

        //this.records = recs;
        app.needsBackup = true;
        this.sort();
        return imported;
      } finally {
        app.importing = false;
        app.importingMessage = "";
      }
    },
    async updateZeroPricesFromCoinDesk() {
      const app = useAppStore();
      app.importing = true;
      app.importingMessage = "Updating ledger prices from CoinDesk...";
      try {
        let updated = 0;
        //make copy of records to avoid modifying state directly while iterating
        const recs = JSON.parse(JSON.stringify(this.records));
        for (let i = 0; i < recs.length; i++) {
          const record = recs[i];
          if (parseFloat(record.price ?? 0.0) !== 0.0) continue;

          if ((record.asset ?? "").toUpperCase() === "USD") {
            record.price = 1.0;
            updated++;
            continue;
          }

          const pair = `${record.asset}-USD`;
          const timestamp = record.timestamp;
          const price = await getCoinDeskPrice(pair, timestamp);
          if (price > 0.0) {
            record.price = price;
            updated++;
          }
        }
        if (updated > 0) {
          app.needsBackup = true;
          this.records = recs;
          this.sort();
        }
        return updated;
      } finally {
        app.importing = false;
        app.importingMessage = "";
      }
    },
  },
});
