import { formatCurrency, formatNumber } from "../utils/moneyUtils";
import { convertToCsv } from "../utils/arrayUtil";

function formatTxs(txs) {
  const _txs = [];
  txs = txs.map((tx) => {
    const t = {};
    t.costBasis = formatNumber(tx.costBasis);
    t.symbol = tx.asset;
    t.account = "Coinbase";
    t.volume = tx.amount;
    t.currency = "USD";
    t.feeCurrency = "USD";
    t.total = tx.costBasis;
    t.memo = "";
    t.date = tx.dateAcquired;
    t.price = tx.price;
    _txs.push(t);
  });
  return _txs;
}
export const generateOpeningPositions = function (txs) {
  const names = [
    "Date",
    "Symbol",
    "Account",
    "Volume",
    "Price",
    "Currency",
    "Fee",
    "FeeCurrency",
    "Total",
    "Memo",
  ];
  const _txs = formatTxs(txs);
  let content = convertToCsv(_txs, names, ",", true);
  return content;
};
export const columns = [
  {
    name: "asset",
    label: "Asset",
    field: "asset",
    align: "left",
  },
  {
    name: "toName",
    label: "To",
    field: "toName",
    align: "left",
  },
  {
    name: "dateGifted",
    label: "Date Gifted",
    field: "date",
    align: "left",
  },
  {
    name: "dateAcquired",
    label: "Date Acquired",
    field: "dateAcquired",
    align: "left",
  },
  {
    name: "amount",
    label: "Amount",
    field: "amount",
    align: "left",
  },
  {
    name: "price",
    label: "Price",
    field: "price",
    align: "right",
    format: (val, row) => formatCurrency(val),
  },
  {
    name: "cost",
    label: "Cost",
    field: "cost",
    align: "right",
    format: (val, row) => formatCurrency(val),
  },
  {
    name: "fee",
    label: "Fee",
    field: "fee",
    align: "right",
    format: (val, row) => formatCurrency(val),
  },
  {
    name: "costBasis",
    label: "Cost Basis",
    field: "costBasis",
    align: "right",
    format: (val, row) => formatCurrency(val),
  },
];
