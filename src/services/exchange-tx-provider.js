import { ethers } from "ethers";
import { actions } from "../boot/actions";
import { getPrice } from "./price-provider";
import { floatToMoney } from "../utils/moneyUtils";
import { LocalStorage } from "quasar";
import { parse } from "csv-parse/browser/esm/sync";
import { filterByAssets } from "./filter-service";

export const processExchangeTradesFile = function (data) {
  const stagedData = parse(data, {
    trim: true,
    columns: true,
    skip_empty_lines: true,
  });
  const mappedData = [];

  for (const op of stagedData) {
    const tradeDate = new Date(op.Date.substring(0, 19));
    const timestamp = tradeDate.getTime() / 1000;
    const action = op.Action.toUpperCase();
    if (!(action == "SELL" || action == "BUY")) {
      throw new Error("Invalid action in trade data.");
    }
    const txId =
      op.ExchangeId && op.ExchangeId.trim() != ""
        ? op.ExchangeId
        : ethers.utils
            .id(
              op.Date +
                op.Action +
                op.Account +
                op.Currency +
                op.Symbol +
                op.Price +
                op.Volume
            )
            .substring(2, 12);
    const date = op.Date.substring(0, 10);
    const account = op.Account == "" ? op.Memo : op.Account;
    mappedData.push({
      timestamp,
      price: parseFloat(op.Price),
      date,
      volume: parseFloat(op.Volume),
      memo: op.Memo,
      account,
      fee: parseFloat(op.Fee),
      feeCurrency: op.FeeCurrency.toUpperCase(),
      currency: op.Currency.toUpperCase(),
      asset: op.Symbol,
      action,
      txId,
    });
  }

  actions.mergeArrayToData(
    "exchangeTrades",
    mappedData,
    (a, b) => a.txId == b.txId
  );
  return mappedData.length;
};

export const getExchangeTrades = async function () {
  const data = LocalStorage.getItem("exchangeTrades") ?? [];
  const mappedData = [];

  for (const tx of data) {
    //a nonUSD fee tx will always be a sell
    //first get USDfee
    let usdFee = 0.0;
    if (tx.feeCurrency != "USD") {
      const feeUSDPrice = await getPrice(tx.feeCurrency, tx.date);
      usdFee = floatToMoney(tx.fee * feeUSDPrice);
      const feeTx = Object.assign({}, tx);
      feeTx.action = "SELL";
      feeTx.txId = "F-" + tx.txId;
      feeTx.price = feeUSDPrice;
      feeTx.asset = tx.feeCurrency;
      feeTx.amount = tx.fee;
      feeTx.fee = 0.0;
      feeTx.feeCurrency = "USD";
      feeTx.currency = "USD";
      feeTx.gross = floatToMoney(feeTx.amount * feeTx.price);
      mappedData.push(feeTx);
    } else {
      usdFee = tx.fee;
    }
    tx.feeCurrency = "USD";
    tx.fee = usdFee;
    if (tx.currency != "USD") {
      const currencyUSDPrice = await getPrice(tx.currency, tx.date);
      const currencyPrice = tx.price;
      const txId = tx.txId;
      const timestamp = tx.timestamp;
      tx.amount = tx.volume;
      tx.price = currencyPrice * currencyUSDPrice;
      tx.gross = floatToMoney(tx.amount * tx.price);
      tx.txId = (tx.action == "SELL" ? "S-" : "B-") + txId;
      tx.timestamp = timestamp + (tx.action == "BUY" ? 1 : 0);
      tx.fee = tx.action == "SELL" ? usdFee : 0.0;
      const currencyTx = Object.assign({}, tx);
      currencyTx.action = tx.action == "SELL" ? "BUY" : "SELL";
      currencyTx.txId = (currencyTx.action == "SELL" ? "S-" : "B-") + txId;
      currencyTx.timestamp = timestamp + (currencyTx.action == "BUY" ? 1 : 0);
      currencyTx.price = currencyUSDPrice;
      currencyTx.asset = tx.currency;
      currencyTx.amount = tx.amount * currencyPrice;
      currencyTx.gross = currencyTx.price * currencyTx.amount;
      currencyTx.fee = currencyTx.action == "SELL" ? usdFee : 0.0;
      if (tx.action == "SELL") {
        mappedData.push(tx);
        mappedData.push(currencyTx);
      } else {
        mappedData.push(currencyTx);
        mappedData.push(tx);
      }
    } else {
      tx.txId = (tx.action == "SELL" ? "S-" : "B-") + tx.txId;
      tx.amount = Math.abs(tx.volume);
      tx.gross = floatToMoney(tx.amount * tx.price);
      tx.fee = usdFee;
      tx.feeCurrency = "USD";
      mappedData.push(tx);
    }
  }

  //TODO set running balances
  const assets = [];
  const _openingPositions = [...(actions.getData("openingPositions") ?? [])];
  for (const op of _openingPositions) {
    let asset = assets.find((a) => a.symbol == op.asset);
    if (!asset) {
      asset = { symbol: op.asset, amount: 0.0 };
      assets.push(asset);
    }
    asset.amount += op.amount;
    op.runningBalance = asset.amount;
  }
  //const _exchangeTrades = [...(actions.getData("exchangeTrades") ?? [])];
  for (const et of mappedData) {
    let asset = assets.find((a) => a.symbol == et.asset);
    if (!asset) {
      asset = { symbol: et.asset, amount: 0.0 };
      assets.push(asset);
    }
    asset.amount += et.action == "BUY" ? et.amount : -et.amount;
    et.runningBalance = asset.amount;
  }
  return mappedData.sort((a, b) => {
    if (a.timestamp != b.timestamp) return a - b;
    return a.txId < b.txId ? 1 : -1;
  });
};

export const columns = [
  {
    name: "date",
    label: "Date",
    field: "date",
    align: "left",
  },
  {
    name: "txId",
    label: "Id",
    field: "txId",
    align: "left",
  },
  {
    name: "account",
    label: "Account",
    field: "account",
    align: "left",
  },
  {
    name: "asset",
    label: "Asset",
    field: "asset",
    align: "left",
  },
  {
    name: "action",
    label: "Action",
    field: "action",
    align: "left",
  },
  {
    name: "amount",
    label: "Amount",
    field: "amount",
    align: "right",
    format: (val, row) => `${(val ?? 0.0).toFixed(4)}`,
  },
  {
    name: "price",
    label: "Price",
    field: "price",
    align: "right",
    format: (val, row) => `$${val ? parseFloat(val).toFixed(2) : "0.00"}`,
  },
  {
    name: "fee",
    label: "Fee",
    field: "fee",
    align: "right",
    format: (val, row) => `$${(val ?? 0.0).toFixed(2)}`,
  },
  {
    name: "gross",
    label: "Gross",
    field: "gross",
    align: "right",
    format: (val, row) => `$${(val ?? 0.0).toFixed(2)}`,
  },
];
