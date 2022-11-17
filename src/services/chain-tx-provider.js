import { ethers } from "ethers";
import { getPrice } from "./price-provider";
import { actions } from "../boot/actions";
const BigNumber = ethers.BigNumber;
import getMethodName from "./methods";
import { LocalStorage } from "quasar";
import { weiToMoney, bnToFloat, formatCurrency } from "src/utils/moneyUtils";

export const ChainTransaction = function () {
  this.init = async function (tx, chain) {
    // this.toAccount = actions.addImportedAddress({ address: tx.to }, chain);
    // this.fromAccount = actions.addImportedAddress({ address: tx.from }, chain);
    this.toAccount = actions.getAccount(tx.to);
    this.fromAccount = actions.getAccount(tx.from);
    this.hash = tx.hash.toLowerCase();
    this.txId = tx.hash.substring(0, 8);
    if (tx.seqNo) {
      this.hash += "-" + tx.seqNo;
      this.txId += "-" + tx.seqNo;
    }
    this.asset = tx.gasType;
    this.toName = this.toAccount ? this.toAccount.name : tx.to.substring(0, 8);
    this.isError = tx.isError == "1";
    this.fromName = this.fromAccount
      ? this.fromAccount.name
      : tx.from.substring(0, 8);
    this.amount = bnToFloat(BigNumber.from(tx.value), 18);
    //this.amount = ethers.utils.formatEther(BigNumber.from(tx.value));
    this.methodName = getMethodName(tx.input);
    //TODO handle income and spending if necessary
    if (this.fromAccount.type && this.toAccount.type) {
      if (
        this.fromAccount.type.includes("Owned") &&
        this.toAccount.type.includes("Owned")
      ) {
        this.taxCode = "TRANSFER";
      } else if (this.fromAccount.type == "Income") {
        this.taxCode = "INCOME";
      } else if (
        this.toAccount.type == "Gift" ||
        this.fromAccount.type == "Gift"
      ) {
        this.taxCode = "GIFT";
      } else if (this.toAccount.type.includes("Donation")) {
        this.taxCode = "DONATION";
      } else if (this.toAccount.type.includes("Spending")) {
        this.taxCode = "SPENDING";
      } else if (this.toAccount.type.includes("Expense")) {
        this.taxCode = "EXPENSE";
      }
    }

    //this.timestamp = new Date(parseInt(tx.timeStamp) * 1000).toUTCString(); //new Date(parseInt(tx.timestamp));
    this.timestamp = parseInt(tx.timeStamp);
    this.date = new Date(this.timestamp * 1000).toISOString().slice(0, 10);
    //Determine if it is INCOME (curve redemption), SPEND (GitCoin), EXPENSE, BUY, SELL
    this.gasType = tx.gasType;
    this.price = await getPrice(this.gasType, this.date);
    this.gross = weiToMoney(BigNumber.from(tx.value), this.price);
    this.gasFee =
      tx.gasUsed == "0"
        ? 0.0
        : bnToFloat(
            BigNumber.from(tx.gasUsed).mul(BigNumber.from(tx.gasPrice)),
            18
          );
    this.fee =
      tx.gasUsed == "0"
        ? 0.0
        : weiToMoney(
            BigNumber.from(tx.gasUsed).mul(BigNumber.from(tx.gasPrice)),
            this.price
          );
    if (this.fromAccount.type.includes("Exchange Owned")) {
      this.fee = 0.0;
      this.gasFee = 0.0;
    }
    return this;
  };
};
export const getChainTransactions = async function () {
  const data = LocalStorage.getItem("chainTransactions") ?? [];
  actions.refreshStoreData("addresses");
  const internalTransactions = actions.getData("internalTransactions", []);
  let hash;
  let seqNo = 0;
  for (const it of internalTransactions) {
    if (it.hash != hash) seqNo = 0;
    hash = it.hash;
    seqNo += 1;
    it.seqNo = seqNo;
  }
  data.push(...internalTransactions);
  data.sort((a, b) => a.timestamp - b.timestamp);
  const mappedTxs = [];
  for (const t of data) {
    const tx = new ChainTransaction();
    //console.log(t.hash);
    await tx.init(t);
    mappedTxs.push(tx);
  }
  return mappedTxs;
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
    name: "from",
    label: "From",
    field: "fromName",
    align: "left",
  },
  {
    name: "to",
    label: "To",
    field: "toName",
    align: "left",
  },
  {
    name: "method",
    label: "Method",
    field: "methodName",
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
    format: (val, row) => `${(parseFloat(val) ?? 0.0).toFixed(4)}`,
  },
  {
    name: "price",
    label: "Price",
    field: "price",
    align: "right",
    format: (val, row) => formatCurrency(val) + " " + row.asset,
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
    name: "error",
    label: "Error",
    field: "isError",
    align: "left",
    format: (val, row) => `${val ? "ERROR" : ""}`,
    style: "color: red; font-weight: bold;",
  },
];
