import { ethers } from "ethers";
import { actions } from "../boot/actions";

import { parse } from "csv-parse/browser/esm/sync";

export const processOffchainTransfersFile = function (tranfers) {
  const stageTransfers = parse(tranfers, {
    trim: true,
    columns: true,
    skip_empty_lines: true,
  });
  const mappedData = stageTransfers.map(function (t) {
    //TODO add usd fee so fees can be added to cap gains
    return {
      timestamp: new Date(t.Date).timestamp,
      date: t.Date.substring(0, 10),
      timestamp: Math.round(
        new Date(t.Date.replaceAll(" ", "")).getTime() / 1000
      ),
      amount: parseFloat(t.Volume),
      fromName: t.FromAccount,
      toName: t.ToAccount,
      asset: t.Symbol,
      transferFee: parseFloat(t.Fee),
      transferFeeCurrency: t.FeeCurrency,
      txId: t.Id.trim()
        ? t.Id.trim()
        : ethers.utils
            .id(t.Date + t.Symbol + t.ToAccount + t.FromAccount + t.Volume)
            .substring(2, 9),
    };
  });
  actions.mergeArrayToData(
    "offchainTransfers",
    mappedData,
    (a, b) => a.txId == b.txId
  );
  return mappedData.length;
};

export const columns = [
  {
    name: "date",
    label: "Transfer Date",
    field: "date",
    align: "left",
  },
  {
    name: "timestamp",
    label: "Timestamp",
    field: "timestamp",
    align: "right",
  },
  {
    name: "txId",
    label: "Id",
    field: "txId",
    align: "left",
  },
  {
    name: "fromName",
    label: "From Account",
    field: "fromName",
    align: "left",
  },
  {
    name: "toName",
    label: "To Account",
    field: "toName",
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
    name: "transferFee",
    label: "Fee",
    field: "transferFee",
    align: "right",
  },
  {
    name: "transferFeeCurrency",
    label: "Fee Currency",
    field: "transferFeeCurrency",
    align: "left",
  },
];
