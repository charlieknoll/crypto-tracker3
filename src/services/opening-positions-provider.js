import { ethers } from "ethers";
import { actions } from "../boot/actions";

//const csv = require("csv/browser/esm");

import { parse } from "csv-parse/browser/esm/sync";
export const processOpeningPositionsFile = async function (openingData) {
  const stageOpeningData = parse(openingData, {
    trim: true,
    columns: true,
    skip_empty_lines: true,
  });
  const mappedOpeningData = stageOpeningData.map(function (op) {
    return {
      timestamp: new Date(op.Date).timestamp,
      memo: op.Memo,
      price: parseFloat(op.Price),
      date: op.Date.substring(0, 10),
      timestamp: Math.round(
        new Date(op.Date.substring(0, 10)).getTime() / 1000
      ),
      amount: parseFloat(op.Volume),
      account: op.Account,
      fee: parseFloat(op.Fee),
      asset: op.Symbol,
      gross:
        Math.round(parseFloat(op.Price) * parseFloat(op.Volume) * 100) / 100,
      txId: ethers.utils
        .id(op.Date + op.Symbol + op.Price + op.Amount)
        .substring(2, 9),
    };
  });
  actions.mergeArrayToData(
    "openingPositions",
    mappedOpeningData,
    (a, b) => a.txId == b.txId
  );
  return mappedOpeningData.length;
};

export const columns = [
  {
    name: "date",
    label: "Acquisition Date",
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
    name: "amount",
    label: "Amount",
    field: "amount",
    align: "right",
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
    label: "Cost",
    field: "gross",
    align: "right",
    format: (val, row) => `$${(val ?? 0.0).toFixed(2)}`,
  },
];
