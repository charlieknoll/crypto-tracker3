import { formatCurrency, formatNumber } from "../utils/moneyUtils";
import { convertToCsvNoHeadher } from "../utils/arrayUtil";
function getTotals(txs) {
  const totals = {
    description: "Totals",
    dateAcquired: "",
    dateSold: "",
    proceeds: 0.0,
    costBasis: 0.0,
    adjustmentCode: "",
    washSaleAdj: 0.0,
    gainOrLoss: 0.0,
  };
  for (const tx of txs) {
    totals.proceeds += tx.proceeds;
    totals.costBasis += tx.costBasis;
    totals.gainOrLoss += tx.gainOrLoss;
    totals.washSaleAdj += tx.washSaleAdj;
  }
  return totals;
}
function formatTxs(txs) {
  txs = txs.map((tx) => {
    tx.adjustmentCode = tx.washSaleAdj > 0.0 ? "W" : "";
    tx.proceeds = formatNumber(tx.proceeds);
    tx.costBasis = formatNumber(tx.costBasis);
    tx.gainOrLoss = formatNumber(tx.gainOrLoss);
    tx.washSaleAdj = formatNumber(tx.washSaleAdj);
    return tx;
  });
}
export const generate8949 = function (txs) {
  const names = [
    "description",
    "dateAcquired",
    "date",
    "proceeds",
    "costBasis",
    "adjustmentCode",
    "washSaleAdj",
    "gainOrLoss",
  ];

  const shortTxs = txs.filter((tx) => tx.longShort == "Short");
  const longTxs = txs.filter((tx) => tx.longShort == "Long");
  shortTxs.push(getTotals(shortTxs));
  longTxs.push(getTotals(longTxs));
  formatTxs(shortTxs);
  formatTxs(longTxs);
  let content = `Form 8949 Statement`;
  content += "\r\n";
  content += "\r\n";
  content += "Part I (Short-Term)";
  content += "\r\n";
  content += `Description (a),Date Acquired(b),Date Sold (c),Proceeds (d),Cost Basis(e),Adjustment Code (f),Adjustment amount(g),Gain or loss(h)`;
  content += "\r\n";
  content += convertToCsvNoHeadher(shortTxs, names, ",");
  content += "\r\n";
  content += "\r\n";
  content += "Part II (Long-Term)";
  content += "\r\n";
  content += `Description (a),Date Acquired(b),Date Sold (c),Proceeds (d),Cost Basis(e),Adjustment Code (f),Adjustment amount(g),Gain or loss(h)`;
  content += "\r\n";
  content += convertToCsvNoHeadher(longTxs, names, ",");
  content += "\r\n";
  content += "\r\n";

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
    name: "dateSold",
    label: "Date Sold",
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
    name: "longShort",
    label: "Type",
    field: "longShort",
    align: "left",
  },
  {
    name: "amount",
    label: "Amount",
    field: "amount",
    align: "left",
  },
  {
    name: "proceeds",
    label: "Proceeds",
    field: "proceeds",
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
  {
    name: "gainOrLoss",
    label: "Gain/Loss",
    field: "gainOrLoss",
    align: "right",
    format: (val, row) => formatCurrency(val),
  },
  {
    name: "washSaleAdj",
    label: "Wash Sale Adj",
    field: "washSaleAdj",
    align: "right",
    format: (val, row) => formatCurrency(val),
  },
];
