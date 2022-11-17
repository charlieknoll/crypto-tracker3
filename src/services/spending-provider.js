import { getChainTransactions } from "./chain-tx-provider";
import { getTokenTransactions } from "./token-tx-provider";
import { formatCurrency, formatDecimalNumber } from "../utils/moneyUtils";

export const getSpending = async function () {
  let mappedData = [];
  const chainTransactions = await getChainTransactions();
  const tokenTransactions = await getTokenTransactions();
  const spendingCodes = ["SPENDING", "EXPENSE", "GIFT", "DONATION"];

  // const filteredChainTxs = chainTransactions.filter(
  //   tx =>
  //     spendingCodes.findIndex(s => s == tx.methodName) > -1 && tx.gross != 0.0
  // );

  mappedData = mappedData.concat(
    chainTransactions
      .filter(
        (tx) =>
          spendingCodes.findIndex((s) => s == tx.taxCode) > -1 &&
          (tx.gross != 0.0 || tx.fee != 0.0) &&
          tx.fromAccount.type != "Gift"
      )
      .map((tx) => {
        tx.account = tx.toAccount.type.includes("Owned")
          ? tx.fromName
          : tx.toName;
        tx.net = tx.toAccount.type.includes("Owned")
          ? tx.gross
          : tx.gross + tx.fee;
        return tx;
      })
  );
  mappedData = mappedData.concat(
    tokenTransactions
      .filter(
        (tx) =>
          spendingCodes.findIndex((s) => s == tx.taxCode) > -1 && tx.tracked
      )
      .map((tx) => {
        tx.amount = tx.decimalAmount;
        tx.account = tx.toAccount.type.includes("Owned")
          ? tx.fromName
          : tx.toName;
        tx.net = tx.parentTx.fromAccount.type.includes("Owned")
          ? tx.gross + tx.fee
          : tx.gross;
        return tx;
      })
  );

  mappedData = mappedData.sort((a, b) => a.timestamp - b.timestamp);
  return mappedData;
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
    name: "taxCode",
    label: "Tax Code",
    field: "taxCode",
    align: "left",
  },
  {
    name: "amount",
    label: "Amount",
    field: "amount",
    align: "right",
    format: (val, row) => formatDecimalNumber(val, 4),
  },
  {
    name: "price",
    label: "Price",
    field: "price",
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
    name: "gross",
    label: "Gross",
    field: "gross",
    align: "right",
    format: (val, row) => formatCurrency(val),
  },
  {
    name: "net",
    label: "Net",
    field: "net",
    align: "right",
    format: (val, row) => formatCurrency(val),
  },
];
