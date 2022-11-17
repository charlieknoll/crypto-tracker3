import { LocalStorage } from "quasar";
import { ethers } from "ethers";
import { getPrice } from "../services/price-provider";
import { actions } from "../boot/actions";
import { store } from "../boot/store";
import { getChainTransactions } from "./chain-tx-provider";
import { bnToFloat } from "src/utils/moneyUtils";
const BigNumber = ethers.BigNumber;
//const baseCurrencies = ["USDC", "USDT", "TUSD", "DAI"];
const tokenPrices = [];

function _initParentTransaction(tx) {
  tx.inTokenTxs = [];
  tx.outTokenTxs = [];
  tx.otherTokenTxs = [];
  tx.usdProceeds = 0.0;
  tx.usdSpent = 0.0;
}

function distributeFee(pt) {
  const allTxs = pt.inTokenTxs.concat(pt.outTokenTxs).concat(pt.otherTokenTxs);
  const feeTxs = [];
  for (const t of allTxs) {
    if (!t.tracked) continue;
    if (!t.amount.eq(0)) {
      feeTxs.push(t);
    } else {
      t.fee = 0.0;
    }
  }
  for (const t of feeTxs) {
    t.fee = pt.fee / feeTxs.length;
  }
}
//For only base currency tx's
function setBaseCurrencySwapTxGross(pt) {
  //take the abs of in and out difference
  const additionalFee = pt.usdProceeds - pt.usdSpent;

  //distribute it as fees on the out txs proportional to value
  const ptGross = pt.usdProceeds > pt.usdSpent ? pt.usdSpent : pt.usdProceeds;
  const txSet =
    pt.usdProceeds > pt.usdSpent
      ? pt.inTokenTxs.filter((inTx) => !inTx.amount.eq(0))
      : pt.outTokenTxs.filter((outTx) => !outTx.amount.eq(0));
  for (const tx of txSet) {
    tx.fee += (additionalFee * tx.gross) / ptGross;
    //console.log("base currency tx:", tx);
  }
}
function setImpliedGrossAndPrices(parentGross, txSet) {
  let totalAmounts = 0.0;
  for (const tx of txSet) {
    totalAmounts += tx.decimalAmount;
  }
  for (const tx of txSet) {
    tx.gross = (tx.decimalAmount / totalAmounts) * parentGross;
    tx.price = tx.gross / tx.decimalAmount;
  }

  //calc prices using the proportional amount parent proceeds
  for (const tx of txSet) {
    ///if (!tx.tracked) continue;
    tokenPrices.unshift({
      symbol: tx.asset,
      price: tx.price,
    });
  }
}
function setBaseCurrencyTokenTxGross(pt) {
  //TODO handle baseCurrency on both sides
  const nonBaseTxs =
    pt.usdProceeds !== 0.0
      ? pt.inTokenTxs.filter((inTx) => !inTx.amount.eq(0))
      : pt.outTokenTxs.filter((outTx) => !outTx.amount.eq(0));
  const parentGross = pt.usdProceeds == 0.0 ? pt.usdSpent : pt.usdProceeds;

  setImpliedGrossAndPrices(parentGross, nonBaseTxs);
}
async function setImpliedTxGross(pt) {
  //no base currency transactions
  //TODO handle price lookups
  //first look for sell in recent prices, if not then buy
  const outTxs = pt.outTokenTxs.filter(
    (outTx) => !outTx.amount.eq(0) && outTx.tracked
  );
  let pricesMapped = true;
  for (const tx of outTxs) {
    tx.tokenPrice = tokenPrices.find((tp) => tp.symbol == tx.asset);
    if (!tx.tokenPrice) {
      tx.tokenPrice = {
        price: await getPrice(tx.asset, tx.date.substring(2, 10)),
        symbol: tx.asset,
      };
    }
    pricesMapped = pricesMapped && tx.tokenPrice;
  }
  let parentGross = 0.0;
  for (const tx of outTxs) {
    tx.price = tx.tokenPrice.price;
    tx.gross = tx.decimalAmount * tx.tokenPrice.price;
    parentGross += tx.gross;
  }
  setImpliedGrossAndPrices(
    parentGross,
    pt.inTokenTxs.filter((tx) => !tx.amount.eq(0))
  );
}
function setGross(pt) {
  //TODO ensure that all tokens are baseTokens

  if (pt.usdProceeds !== 0.0 && pt.usdSpent !== 0.0) {
    setBaseCurrencySwapTxGross(pt);
  } else if (pt.usdProceeds + pt.usdSpent != 0.0) {
    setBaseCurrencyTokenTxGross(pt);
  } else {
    setImpliedTxGross(pt);
  }
}

function TokenTransaction() {
  this.initParentTransaction = async function (parentTxs) {
    //set parent transaction
    this.parentTx = parentTxs.find((pt) => pt.hash == this.hash);
    if (!this.parentTx) {
      //TODO trigger download from etherscan
      this.parentTx = { hash: this.hash };
      _initParentTransaction(this.parentTx);
    }
  };
  this.initTokenTx = async function (baseCurrencies, trackedTokens) {
    //TODO Clean this up and correctly set spent and proceeds

    this.methodName = this.parentTx.methodName;

    this.tracked = trackedTokens.findIndex((asset) => asset == this.asset) > -1;

    if (!this.toAccount.type || !this.fromAccount.type) {
      this.taxCode = "UNKNOWN ADDR";
      //return;
    }
    this.gross = 0.0;
    this.marketGross = 0.0;
    if (baseCurrencies.find((c) => c == this.asset.toUpperCase())) {
      this.gross = bnToFloat(this.amount, this.tokenDecimal);
      this.price = 1.0;
    } else if (this.tracked) {
      this.price = await getPrice(this.asset, this.date);
      this.gross = this.price * bnToFloat(this.amount, this.tokenDecimal);
    }

    if (
      this.toAccount.type.includes("Owned") &&
      !this.fromAccount.type.includes("Owned")
    ) {
      this.parentTx.inTokenTxs.push(this);
      this.parentTx.usdSpent += this.gross;
      //assign fees proportionally to non baseCurrency buys/sells
      if (this.parentTx.toAccount && this.parentTx.toAccount.type == "Income") {
        this.taxCode = "INCOME";
      } else {
        this.taxCode = this.fromName.toLowerCase().includes("spam")
          ? "SPAM"
          : "BUY";
      }
    } else if (
      this.fromAccount.type.includes("Owned") &&
      !this.toAccount.type.includes("Owned")
    ) {
      this.parentTx.outTokenTxs.push(this);
      this.parentTx.usdProceeds += this.gross;
      let taxCode;
      if (!this.parentTx.toAccount) {
        taxCode = "SELL";
      } else if (this.parentTx.toAccount.type == "Gift") {
        taxCode = "GIFT";
      } else if (this.parentTx.toAccount.type == "Spending") {
        taxCode = "SPENDING";
      } else if (this.parentTx.toAccount.type == "Donation") {
        taxCode = "DONATION";
      } else if (this.parentTx.toAccount.type == "Expense") {
        taxCode = "EXPENSE";
      } else if (this.parentTx.toAccount.type == "Token") {
        taxCode = "SELL";
      } else {
        taxCode = "TRANSFER";
      }

      this.taxCode = taxCode;
    } else {
      this.taxCode = "TRANSFER";
      this.gross = 0.0;
      this.parentTx.otherTokenTxs.push(this);
    }

    this.seqNo =
      this.parentTx.outTokenTxs.length +
      this.parentTx.inTokenTxs.length +
      this.parentTx.otherTokenTxs.length;
    this.txId = this.hash.substring(2, 8) + "-" + this.seqNo;
  };
  this.init = async function (tx, chain) {
    this.toAccount = actions.getAccount(tx.to);
    this.fromAccount = actions.getAccount(tx.from);
    this.asset = tx.tokenSymbol;
    this.gasType = tx.gasType;
    this.tokenDecimal = tx.tokenDecimal;
    this.hash = tx.hash.toLowerCase();
    this.toName = this.toAccount.name;
    this.fromName = this.fromAccount.name;
    //TODO convert amount using token decimal
    this.amount = BigNumber.from(tx.value);
    this.displayAmount = ethers.utils.formatUnits(tx.value, tx.tokenDecimal);
    this.decimalAmount = bnToFloat(this.amount, this.tokenDecimal);
    const parts = this.displayAmount.split(".");
    if (parts[0].length > 10) {
      this.displayAmount = parts[0][0];
      this.displayAmount += "." + parts[0].substring(1) + parts[1];
      this.displayAmount =
        this.displayAmount.substring(0, 6) + "e+" + (parts[0].length - 1);
    } else if (parts.length > 1 && parts[1].length > 6) {
      this.displayAmount = parts[0] + "." + parts[1].substring(0, 4);
    }
    this.timestamp = parseInt(tx.timeStamp);
    this.date = new Date(this.timestamp * 1000).toISOString().slice(0, 10);
    let gasPrice = await getPrice(tx.gasType, this.date);
    this.fee =
      Math.round(
        ethers.utils.formatEther(
          BigNumber.from(tx.gasUsed)
            .mul(BigNumber.from(tx.gasPrice))
            .mul(BigNumber.from(Math.round(parseFloat(gasPrice)) * 100))
        )
      ) / 100;
  };
}

export const getTokenTransactions = async function () {
  //build tx list
  //fields: tx-seqno, timestamp, short date fee, ethprice, token, action, realized short term gain, realized long term gain,
  //cost basis
  const tokentxs = LocalStorage.getItem("tokenTransactions") ?? [];
  //start with tx's and insert any token txs
  const mappedTxs = [];
  const parentTxs = await getChainTransactions();
  const baseCurrencies = actions.getBaseCurrencies();
  let trackedTokens = store.settings.trackedTokens
    ? store.settings.trackedTokens.replaceAll(" ", "").split(",")
    : [];
  if (trackedTokens.length == 1 && trackedTokens[0] == "") {
    trackedTokens.pop();
  }
  trackedTokens.push(...baseCurrencies);
  for (const pt of parentTxs) {
    _initParentTransaction(pt);
  }
  for (const t of tokentxs) {
    const tokenTx = new TokenTransaction();
    await tokenTx.init(t);
    await tokenTx.initParentTransaction(parentTxs);
    if (
      store.settings.trackSpentTokens &&
      tokenTx.fromAccount.type &&
      tokenTx.fromAccount.type.toLowerCase().includes("owned") &&
      tokenTx.asset != "ETH" &&
      tokenTx.asset &&
      !tokenTx.asset.includes("tinyurl")
    ) {
      if (trackedTokens.findIndex((tt) => tt == tokenTx.asset) == -1) {
        trackedTokens.push(tokenTx.asset);
      }
    }
    mappedTxs.push(tokenTx);
  }

  for (const t of mappedTxs) {
    await t.initTokenTx(baseCurrencies, trackedTokens);
  }

  //distribute baseCurrency costs/proceeds and fees to non baseCurrency
  for (const pt of parentTxs) {
    distributeFee(pt);
  }
  for (const pt of parentTxs) {
    setGross(pt);
  }
  //console.log("Token Prices", tokenPrices);
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
    name: "asset",
    label: "Token",
    field: "asset",
    align: "left",
  },
  {
    name: "methodName",
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
    field: "displayAmount",
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
    name: "gross",
    label: "Gross",
    field: "gross",
    align: "right",
    format: (val, row) => `$${(val ?? 0.0).toFixed(2)}`,
  },
  {
    name: "fee",
    label: "Fee",
    field: "fee",
    align: "right",
    format: (val, row) => `$${(val ?? 0.0).toFixed(2)}`,
  },
];
