import { parseEther } from "ethers";
import { defineStore } from "pinia";
import {
  currencyRounded,
  multiplyCurrency,
  floatToWei,
} from "src/utils/number-helpers";
import { daysDifference } from "src/utils/date-helper";
import { useOpeningPositionsStore } from "./opening-positions-store";
import { useOffchainTransfersStore } from "./offchain-transfers-store";
import { useChainTxsStore } from "./chain-txs-store";
import { useExchangeTradesStore } from "./exchange-trades-store";
import { formatEther } from "ethers";
import { timestamp } from "@vueuse/core";
import { useRunningBalancesStore } from "./running-balances-store";
const sortByTimeStampThenSortThenId = (a, b) =>
  a.timestamp - b.timestamp ||
  (a.sort ?? 0) - (b.sort ?? 0) ||
  (a.id ?? "").localeCompare(b.id ?? "");
const sortByTimeStampThenSortThenTxId = (a, b) =>
  a.timestamp - b.timestamp ||
  (a.sort ?? 0) - (b.sort ?? 0) ||
  (a.txId ?? "").localeCompare(b.txId ?? "");

function handleError(tx, source, error) {
  console.log(tx);
  console.log("Source:");
  console.log(source);
  throw new Error(error);
}
function checkPrice(price, asset, timestamp, currency) {
  if (!price)
    throw new Error(
      `Price not set for ${asset}:${currency} at ${new Date(
        timestamp * 1000
      ).toString()} `
    );
}
function validateCostBasisTx(tx, source) {
  if (!tx.account) {
    handleError(tx, source, "Cost basis tx missing account");
  }
  if (!tx.timestamp) {
    handleError(tx, source, "Cost basis tx missing timestamp");
  }
  if (!tx.asset) {
    handleError(tx, source, "Cost basis tx missing asset");
  }
  if (tx.fee === undefined || tx.fee === null || isNaN(tx.fee)) {
    handleError(tx, source, "Cost basis tx missing fee");
  }
  if (!tx.id) {
    handleError(tx, source, "Cost basis tx missing id");
  }
  if (!tx.type) {
    handleError(tx, source, "Cost basis tx missing type");
  }
}

function getCostBasisTxs(chainTransactions, offchainTransfers, exchangeFees) {
  let costBasisTxs = [];
  //token fee txs are eth fees paid on token interactions, not buy/sell txs
  //they should be added to cost basis of the token tx they are associated with
  //and costbasis should be distributed evenly across all tokens in the account at time
  //TODO move to cost basis calculation
  let tokenFeeTxs = chainTransactions.filter((tx) => tx.txType == "F");
  tokenFeeTxs = tokenFeeTxs.map((tx) => {
    const tokenFeeTx = {};
    tokenFeeTx.account = tx.fromWalletName ?? tx.fromAccountName;
    tokenFeeTx.timestamp = tx.timestamp;
    //assign cost basis after initiating tx
    tokenFeeTx.sort = 1;
    tokenFeeTx.asset = tx.asset;
    tokenFeeTx.fee = tx.fee;
    tokenFeeTx.id = tx.id;
    tokenFeeTx.type = "TOKEN-FEE";
    validateCostBasisTx(tokenFeeTx, tx);
    return tokenFeeTx;
  });
  costBasisTxs = costBasisTxs.concat(tokenFeeTxs);

  //TODO Add exchange.fees

  let exchangeFeeTxs = exchangeFees.map((tx) => {
    const feeTx = {};
    feeTx.account = tx.account;
    feeTx.timestamp = Math.floor(tx.timestamp);
    //assign cost basis after initiating tx
    feeTx.asset = tx.asset;
    feeTx.fee = tx.proceeds;
    feeTx.id = tx.hash;
    feeTx.type = "EXCHANGE-FEE";
    validateCostBasisTx(feeTx, tx);
    return feeTx;
  });
  costBasisTxs = costBasisTxs.concat(exchangeFeeTxs);

  let chainTransfers = chainTransactions.filter(
    (tx) => tx.taxCode == "TRANSFER" && !tx.isError && tx.fee > 0.0
  );
  chainTransfers = chainTransfers.map((tx) => {
    const transferTx = {};
    transferTx.account = tx.toWalletName ?? tx.toAccountName;
    transferTx.timestamp = tx.timestamp;
    transferTx.sort = 1;
    transferTx.asset = tx.asset;
    transferTx.fee = tx.fee;
    transferTx.type = "CHAIN-TRANSFER-FEE";
    transferTx.id = tx.id;
    validateCostBasisTx(transferTx, tx);
    return transferTx;
  });
  costBasisTxs = costBasisTxs.concat(chainTransfers);

  offchainTransfers = offchainTransfers.filter(
    (tx) => tx.type == "TRANSFER" && tx.fee > 0.0
  );
  offchainTransfers = offchainTransfers.map((tx) => {
    const transferTx = {};
    transferTx.account = tx.toAccount;
    transferTx.timestamp = tx.timestamp;
    transferTx.sort = 1;
    transferTx.asset = tx.asset;
    transferTx.fee = tx.fee;
    transferTx.type = "OFFCHAIN-TRANSFER-FEE";
    transferTx.id = tx.id;
    validateCostBasisTx(transferTx, tx);
    return transferTx;
  });
  costBasisTxs = costBasisTxs.concat(offchainTransfers);

  costBasisTxs = costBasisTxs.map((tx) => {
    tx.taxTxType = "COST-BASIS";
    tx.fee = currencyRounded(tx.fee);
    return tx;
  });
  return costBasisTxs;
}

function validateSellTx(tx, source) {
  if (!tx.account) {
    handleError(tx, source, "Sell tx missing account");
  }
  if (!tx.timestamp) {
    handleError(tx, source, "Sell tx missing timestamp");
  }
  if (!tx.asset) {
    handleError(tx, source, "Sell tx missing asset");
  }
  if (
    !tx.amount ||
    typeof tx.amount !== "bigint" ||
    parseFloat(formatEther(tx.amount)) <= 0.0
  ) {
    handleError(tx, source, "Sell tx invalid amount");
  }
  if (
    tx.price === undefined ||
    tx.price === null ||
    isNaN(tx.price) ||
    tx.price < 0.0 ||
    (tx.type == "GIFT-OUT" && tx.price != 0.0)
  ) {
    handleError(tx, source, "Sell tx invalid price");
  }
  if (tx.fee === undefined || tx.fee === null || isNaN(tx.fee)) {
    handleError(tx, source, "Sell tx missing fee");
  }
  if (tx.type === undefined || tx.type === null) {
    handleError(tx, source, "Sell tx missing type");
  }
  if (!tx.id) {
    handleError(tx, source, "Sell tx missing id");
  }
}
function getSellTxs(chainTransactions, exchangeTrades, offchainTransfers) {
  let sellTxs = [];

  let txs = chainTransactions.filter(
    (tx) =>
      (tx.taxCode == "SPENDING" || tx.taxCode == "EXPENSE") &&
      !tx.isError &&
      BigInt(tx.value) != BigInt("0")
  );
  let spendTxs = [];
  txs.forEach((tx) => {
    //if (BigInt(tx.value) == BigInt("0")) return;
    const spendTx = {};
    spendTx.account = tx.fromWalletName ?? tx.fromAccountName;
    spendTx.timestamp = tx.timestamp;
    spendTx.asset = tx.asset;
    spendTx.amount = BigInt(tx.value) ?? BigInt("0");
    checkPrice(tx.price, tx.asset, tx.timestamp);
    spendTx.price = tx.price;
    spendTx.fee = tx.fee;
    spendTx.type = tx.taxCode;
    spendTx.id = tx.id;
    validateSellTx(spendTx, tx);
    spendTxs.push(spendTx);
  });
  sellTxs = sellTxs.concat(spendTxs);

  //Track this to properly track cost basis of gifts
  // price = 0, ignore on final report since it is given away
  let giftTxs = chainTransactions.filter(
    (tx) => tx.taxCode == "GIFT-OUT" && !tx.isError && tx.fromName != "GENESIS"
  );
  giftTxs = giftTxs.map((tx) => {
    const giftTx = {};
    giftTx.account = tx.fromWalletName ?? tx.fromAccountName;
    giftTx.timestamp = tx.timestamp;
    giftTx.asset = tx.asset;
    giftTx.amount = BigInt(tx.value) ?? BigInt("0");
    giftTx.price = 0.0;
    giftTx.fee = tx.fee;
    giftTx.type = tx.taxCode;
    giftTx.id = tx.id;
    validateSellTx(giftTx, tx);
    return giftTx;
  });
  sellTxs = sellTxs.concat(giftTxs);

  let sellAssetTxs = chainTransactions.filter(
    (tx) => tx.taxCode == "SELL" && tx.amount != 0.0
  );
  sellAssetTxs = sellAssetTxs.map((tx) => {
    const sellAssetTx = {};
    sellAssetTx.account = tx.fromWalletName ?? tx.fromAccountName;
    sellAssetTx.timestamp = tx.timestamp;
    sellAssetTx.asset = tx.asset;
    sellAssetTx.amount = BigInt(tx.value) ?? BigInt("0");
    checkPrice(tx.price, tx.asset, tx.timestamp);
    sellAssetTx.price = tx.price;
    sellAssetTx.fee = tx.fee;
    sellAssetTx.type = "CHAIN-SELL";
    sellAssetTx.id = tx.id;
    validateSellTx(sellAssetTx, tx);
    return sellAssetTx;
  });
  sellTxs = sellTxs.concat(sellAssetTxs);

  //TODO is tx.fee always USD?
  let exchangeTxs = exchangeTrades.filter(
    (tx) => tx.action == "SELL" && tx.amount != 0.0
  );
  exchangeTxs = exchangeTxs.map((tx) => {
    const exchangeTx = {};
    exchangeTx.id = tx.id;
    exchangeTx.account = tx.account;
    exchangeTx.timestamp = tx.timestamp;
    exchangeTx.asset = tx.asset;
    exchangeTx.amount = floatToWei(tx.amount);
    checkPrice(tx.price, tx.asset, tx.timestamp, tx.currency);
    exchangeTx.price = tx.price;
    exchangeTx.fee = tx.fee;
    exchangeTx.sort = tx.sort;
    exchangeTx.type = "EXCH-SELL";
    validateSellTx(exchangeTx, tx);
    return exchangeTx;
  });
  sellTxs = sellTxs.concat(exchangeTxs);

  //TODO
  //get gasFees spent
  let gasFeeTxs = chainTransactions.filter(
    (tx) =>
      tx.gasFee > BigInt("0") &&
      tx.txType == "C" &&
      tx.fromAccount.type == "Owned"
  );
  //TODO these are just sells, worry about cost basis effects later
  gasFeeTxs = gasFeeTxs.map((tx) => {
    const feeTx = {};
    feeTx.id = tx.id;
    feeTx.account = tx.fromWalletName ?? tx.fromAccountName;
    feeTx.asset = tx.gasType;
    //TODO add sort intead of timestamp hack
    feeTx.timestamp = tx.timestamp;
    //fee is sold first, then the main tx sell should be handled after
    feeTx.sort = -1;
    feeTx.amount = BigInt(tx.gasFee) ?? BigInt("0");
    feeTx.fee = 0.0;
    checkPrice(tx.price, tx.asset, tx.timestamp);
    feeTx.price = tx.price;
    feeTx.type = "GAS-FEE-SPENT";
    validateSellTx(feeTx, tx);
    return feeTx;
  });
  sellTxs = sellTxs.concat(gasFeeTxs);

  //tx.type == "FEE" ensures only non USD
  let offChainFeeTxs = offchainTransfers.filter(
    (tx) => tx.type == "FEE" && tx.amount > 0.0
  );

  const _offChainFeeTxs = [];
  for (const tx of offChainFeeTxs) {
    const feeTx = {};
    feeTx.id = tx.id;
    //No need to handle wallet here, account is always a wallt for an exchange
    feeTx.account = tx.fromAccount;
    feeTx.asset = tx.asset;
    feeTx.timestamp = tx.timestamp;
    //fee is sold after transfer and his applied to the receiver's cost basis
    feeTx.sort = 1;
    feeTx.amount = floatToWei(tx.amount);
    feeTx.fee = 0.0;
    checkPrice(tx.price, tx.asset, tx.timestamp);

    //feeTx.price = prices.getPrice(tx.feeCurrency, tx.date, tx.timestamp);
    feeTx.price = tx.price;
    feeTx.type = "OFFCHAIN-FEE";
    validateSellTx(feeTx, tx);
    _offChainFeeTxs.push(feeTx);
  }
  sellTxs = sellTxs.concat(_offChainFeeTxs);

  sellTxs = sellTxs.map((tx) => {
    tx.proceeds = currencyRounded(
      multiplyCurrency([tx.price, parseFloat(formatEther(tx.amount))]) - tx.fee
    );
    tx.remainingAmount = tx.amount; //BigInt
    tx.remainingProceeds = tx.proceeds;
    tx.taxTxType = "SELL";
    return tx;
  });
  return sellTxs;
}

function validateBuyTx(tx, source) {
  if (!tx.account) {
    handleError(tx, source, "Buy tx missing account");
  }
  if (!tx.timestamp) {
    handleError(tx, source, "Buy tx missing timestamp");
  }
  if (!tx.asset) {
    handleError(tx, source, "Buy tx missing asset");
  }
  if (!tx.amount || typeof tx.amount !== "bigint" || tx.amount <= BigInt("0")) {
    handleError(tx, source, "Buy tx invalid amount");
  }
  if (
    tx.price === undefined ||
    tx.price === null ||
    isNaN(tx.price) ||
    tx.price < 0.0
  ) {
    handleError(tx, source, "Buy tx invalid price");
  }
  if (tx.fee === undefined || tx.fee === null || isNaN(tx.fee)) {
    handleError(tx, source, "Buy tx missing fee");
  }
  if (!tx.id) {
    handleError(tx, source, "Buy tx missing id");
  }
  if (!tx.type) {
    handleError(tx, source, "Buy tx missing type");
  }
}
function getBuyTxs(chainTxs, exchangeTrades, openingPositions) {
  //TODO Add received gifts?

  let buyTxs = chainTxs.filter(
    (tx) =>
      tx.taxCode == "BUY" ||
      ((tx.taxCode == "INCOME" || tx.taxCode == "EXPENSE REFUND") &&
        tx.value > BigInt("0") &&
        !tx.isError)
  );
  buyTxs = buyTxs.map((tx) => {
    const buyTx = {};
    buyTx.account = tx.toWalletName ?? tx.toAccountName;
    buyTx.timestamp = tx.timestamp;
    buyTx.asset = tx.asset;
    buyTx.amount = BigInt(tx.value);
    buyTx.price = tx.price;
    buyTx.fee = tx.fee;
    buyTx.id = tx.id;
    buyTx.type = "CHAIN-" + tx.taxCode;
    validateBuyTx(buyTx, tx);
    return buyTx;
  });
  let giftTxs = chainTxs.filter(
    (tx) =>
      tx.taxCode == "GIFT-IN" && BigInt(tx.value ?? "0") > 0 && !tx.isError
  );
  giftTxs = giftTxs.map((tx) => {
    const buyTx = {};
    buyTx.account = tx.toWalletName ?? tx.toAccountName;
    buyTx.timestamp = tx.timestamp;
    buyTx.asset = tx.asset;
    buyTx.amount = BigInt(tx.value ?? "0");
    buyTx.price = tx.price;
    buyTx.fee = 0.0;
    buyTx.id = tx.id;
    buyTx.type = "CHAIN-" + tx.taxCode;
    validateBuyTx(buyTx, tx);
    return buyTx;
  });
  buyTxs = buyTxs.concat(giftTxs);

  let _buyExchangeTrades = exchangeTrades.filter(
    (tx) => tx.action == "BUY" && tx.amount > 0.0
  );
  _buyExchangeTrades = _buyExchangeTrades.map((tx) => {
    const buyTx = {};
    buyTx.account = tx.account;
    buyTx.timestamp = tx.timestamp;
    buyTx.asset = tx.asset;

    buyTx.amount = floatToWei(tx.amount);
    buyTx.price = tx.price;
    buyTx.fee = tx.fee;
    buyTx.id = tx.id;
    buyTx.type = "EXCH-BUY";
    validateBuyTx(buyTx, tx);
    return buyTx;
  });
  buyTxs = buyTxs.concat(_buyExchangeTrades);

  let _openingPostions = openingPositions.map((tx) => {
    const oTx = {};
    oTx.account = tx.account;
    oTx.timestamp = tx.timestamp;
    oTx.asset = tx.asset;
    oTx.amount = floatToWei(tx.amount);
    oTx.price = tx.price;
    oTx.fee = tx.fee;
    oTx.id = tx.id;
    oTx.type = "OPENING-POSITION";
    validateBuyTx(oTx, tx);
    return oTx;
  });
  buyTxs = buyTxs.concat(_openingPostions);

  buyTxs = buyTxs.map((tx) => {
    tx.taxTxType = "BUY";
    tx.gross = currencyRounded(
      multiplyCurrency([tx.price, parseFloat(formatEther(tx.amount))])
    );
    tx.costBasis = currencyRounded(+tx.gross + +tx.fee);
    tx.remainingAmount = tx.amount ?? BigInt("0.0");
    tx.remainingCostBasis = tx.costBasis;
    return tx;
  });

  return buyTxs;
}
function validateTransferTx(tx, source) {
  if (!tx.fromAccount) {
    handleError(tx, source, "Transfer tx missing fromAccount");
  }
  if (!tx.toAccount) {
    handleError(tx, source, "Transfer tx missing toAccount");
  }
  if (!tx.timestamp) {
    handleError(tx, source, "Transfer tx missing timestamp");
  }
  if (!tx.asset) {
    handleError(tx, source, "Transfer tx missing asset");
  }
  if (!tx.amount || parseFloat(formatEther(tx.amount)) <= 0.0) {
    handleError(tx, source, "Transfer tx invalid amount");
  }
  if (!tx.id) {
    handleError(tx, source, "Transfer tx missing id");
  }
  if (!tx.type) {
    handleError(tx, source, "Transfer tx missing type");
  }
  if (tx.fee === undefined || tx.fee === null || isNaN(tx.fee)) {
    handleError(tx, source, "Transfer tx missing fee");
  }
}
function getTransferTxs(chainTransactions, offchainTransfers) {
  //TODO
  let transferTxs = [];

  let chainTransfers = chainTransactions.filter(
    (tx) =>
      tx.taxCode == "TRANSFER" && !tx.isError && BigInt(tx.value) != BigInt("0")
  );
  chainTransfers = chainTransfers.map((tx) => {
    const transferTx = {};
    transferTx.fromAccount = tx.fromWalletName ?? tx.fromAccountName;
    transferTx.toAccount = tx.toWalletName ?? tx.toAccountName;
    transferTx.timestamp = tx.timestamp;
    transferTx.asset = tx.asset;
    transferTx.amount = BigInt(tx.value ?? "0");
    transferTx.type = "CHAIN-TRANSFER";
    transferTx.id = tx.id;
    transferTx.fee = tx.fee;
    validateTransferTx(transferTx, tx);
    return transferTx;
  });
  transferTxs = transferTxs.concat(chainTransfers);

  offchainTransfers = offchainTransfers.filter(
    (tx) => tx.type == "TRANSFER" && tx.amount > 0.0
  );
  offchainTransfers = offchainTransfers.map((tx) => {
    const transferTx = {};
    transferTx.fromAccount = tx.fromAccount;
    transferTx.toAccount = tx.toAccount;
    transferTx.timestamp = tx.timestamp;
    transferTx.asset = tx.asset;
    transferTx.amount = floatToWei(tx.amount);
    transferTx.type = "OFFCHAIN-TRANSFER";
    transferTx.id = tx.id;
    transferTx.fee = tx.fee;
    validateTransferTx(transferTx, tx);
    return transferTx;
  });
  transferTxs = transferTxs.concat(offchainTransfers);
  transferTxs = transferTxs.map((tx) => {
    tx.fee = currencyRounded(tx.fee);
    tx.taxTxType = "TRANSFER";
    return tx;
  });
  return transferTxs;
}
function findLot(tx, undisposedLots) {
  //TODO handle wallet cutovers by resetting walletName on undisposedLots
  return undisposedLots.find(
    (lot) =>
      lot.asset == tx.asset &&
      lot.account == tx.account &&
      lot.remainingAmount > BigInt("0")
  );
}
function verifyBalance(tx, runningBalances, undisposedLots, soldLots) {
  // if (undisposedLots.length == 6) {
  //   console.log(undisposedLots);
  // }

  //running balances handles gas fees as part of transfer but cost basis consideres them spent before transfer
  //so wait to verify balance on next tx
  if (tx.sort == -1) return;

  const calculatedBalance = undisposedLots.reduce((sum, lot) => {
    if (lot.account == tx.account && lot.asset == tx.asset) {
      return BigInt(sum) + BigInt(lot.remainingAmount);
    }
    return BigInt(sum);
  }, BigInt("0"));

  const relevantBalanceRec = runningBalances.find(
    (rb) =>
      rb.account == tx.account &&
      rb.asset == tx.asset &&
      rb.timestamp == tx.timestamp &&
      rb.biRunningAccountBalance == calculatedBalance
  );
  if (!relevantBalanceRec) {
    debugger;
    return;
  } else {
    if (tx.account == "Poloniex" && tx.asset == "BTC") {
      console.log(
        `${new Date(tx.timestamp * 1000).toString()} ${tx.id.substring(
          0,
          20
        )}: txAmount: ${formatEther(tx.amount)}, rbAmount: ${formatEther(
          relevantBalanceRec.biAmount
        )} rb: ${formatEther(relevantBalanceRec.biRunningAccountBalance)} `
      );
    }
  }
}

function getCostBasis() {
  //raw from localStorage
  console.time("getStores-openingPositions");
  const openingPositions = useOpeningPositionsStore().records;
  console.timeEnd("getStores-openingPositions");
  console.time("getStores-offchainTransfers");

  const offchainTransfers = useOffchainTransfersStore().split;
  console.timeEnd("getStores-offchainTransfers");
  console.time("getStores-chainTransactions");

  const chainTransactions = useChainTxsStore().accountTxs;
  console.timeEnd("getStores-chainTransactions");
  console.time("getStores-exchangeTrades");

  const exchangeTrades = useExchangeTradesStore().split;
  //TODO this probably will include rewards for Kraken
  const exchangeFees = useExchangeTradesStore().fees;
  console.timeEnd("getStores-exchangeTrades");

  console.time("Sells");

  let sellTxs = getSellTxs(
    chainTransactions,
    exchangeTrades,
    offchainTransfers
  );
  console.timeEnd("Sells");
  console.time("Buys");
  let buyTxs = getBuyTxs(chainTransactions, exchangeTrades, openingPositions);

  let costBasisTxs = getCostBasisTxs(
    chainTransactions,
    offchainTransfers,
    exchangeFees
  );
  console.timeEnd("Buys");
  console.time("Transfers");

  let transferTxs = getTransferTxs(chainTransactions, offchainTransfers);
  console.timeEnd("Transfers");
  let undisposedLots = [];
  const soldLots = [];

  //Merge all txs and sort by timestamp
  let mappedData = [];
  mappedData = mappedData.concat(sellTxs);
  mappedData = mappedData.concat(buyTxs);
  mappedData = mappedData.concat(costBasisTxs);
  mappedData = mappedData.concat(transferTxs);
  mappedData = mappedData.sort(sortByTimeStampThenSortThenId);
  const runningBalancesStore = useRunningBalancesStore();
  let runningBalances = runningBalancesStore.runningBalances.mappedData.sort(
    sortByTimeStampThenSortThenTxId
  );

  mappedData.forEach((tx) => {
    //TODO handle account/wallet cutover timestamp by resetting walletName on undisposedLots
    if (tx.taxTxType.substring(0, 3) === "BUY") {
      undisposedLots.push(tx);
      verifyBalance(tx, runningBalances, undisposedLots, soldLots);
    }
    if (tx.taxTxType === "SELL") {
      let remainingAmount = tx.amount;
      let remainingProceeds = tx.proceeds;
      let lot = findLot(tx, undisposedLots);
      while (remainingAmount > 0 && lot) {
        let lotAmount = lot.remainingAmount;
        if (lotAmount > remainingAmount) {
          lotAmount = remainingAmount;
        }
        let costBasisPortion =
          (lot.costBasis / parseFloat(formatEther(lot.amount))) *
          parseFloat(formatEther(lotAmount));
        if (currencyRounded(lot.costBasis - costBasisPortion) < 0.0) {
          //Handle rare case where costBasis are negative due to rounding
          costBasisPortion = lot.costBasis;
        }
        let proceedsPortion =
          (tx.proceeds / parseFloat(formatEther(tx.amount))) *
          parseFloat(formatEther(lotAmount));

        if (currencyRounded(remainingProceeds - proceedsPortion) < 0.0) {
          //Handle rare case where proceeds are negative due to rounding
          proceedsPortion = remainingProceeds;
        }
        const soldLot = {
          account: tx.account,
          asset: tx.asset,
          buyTxId: lot.id,
          buyTxType: lot.type,
          buyTimestamp: lot.timestamp,
          id: tx.id,
          type: tx.type,
          timestamp: tx.timestamp,
          daysHeld: daysDifference(tx.timestamp, lot.timestamp),
          amount: lotAmount,
          costBasis: currencyRounded(costBasisPortion),
          proceeds: currencyRounded(proceedsPortion),
          gainLoss: currencyRounded(proceedsPortion - costBasisPortion),
          taxTxType: "SELL",
        };
        soldLots.push(soldLot);

        //TOOD check that bigint works here
        lot.remainingAmount -= lotAmount;
        lot.remainingCostBasis =
          lot.remainingAmount == BigInt("0")
            ? 0.0
            : currencyRounded(lot.remainingCostBasis - costBasisPortion);

        remainingAmount -= lotAmount;
        remainingProceeds =
          remainingAmount == BigInt("0")
            ? 0.0
            : currencyRounded(remainingProceeds - proceedsPortion);

        if (lot.remainingAmount < BigInt("0")) {
          debugger;
          throw new Error("Lot remaining amount negative");
        }
        if (lot.remainingCostBasis < 0.0) {
          debugger;
          throw new Error("Lot remaining cost basis negative");
        }
        if (remainingAmount > BigInt("0")) {
          //find the next undisposed lot
          lot = findLot(tx, undisposedLots);
        } else lot = null;
      }
      if (remainingAmount > BigInt("0")) {
        debugger;
        throw new Error(
          `Cannot find enough inventory for ${tx.account}:${
            tx.asset
          }, amount remaining: ${formatEther(remainingAmount)}`
        );
      }
      verifyBalance(tx, runningBalances, undisposedLots, soldLots);
    }
    if (tx.taxTxType === "COST-BASIS") {
      //Distribute cost basis fee across all undisposed lots in the account for the asset
      const relevantLots = undisposedLots.filter(
        (lot) =>
          lot.account == tx.account &&
          lot.asset == tx.asset &&
          lot.remainingAmount > BigInt("0")
      );
      const totalAmount = relevantLots.reduce(
        (sum, lot) => sum + parseFloat(formatEther(lot.remainingAmount)),
        0.0
      );
      for (const lot of relevantLots) {
        const lotAmount = parseFloat(formatEther(lot.remainingAmount));
        const costBasisPortion = (lotAmount / totalAmount) * tx.fee;

        //TODO check this is working
        lot.costBasis += currencyRounded(costBasisPortion);
        lot.remainingCostBasis += currencyRounded(costBasisPortion);
      }
    }
    if (tx.taxTxType === "TRANSFER") {
      //first "mini-SELL" from fromAccount
      let remainingAmount = tx.amount;
      let lot = findLot(
        {
          asset: tx.asset,
          account: tx.fromAccount,
        },
        undisposedLots
      );
      let costBasisPortion = 0.0;
      while (remainingAmount > 0 && lot) {
        let lotAmount = lot.remainingAmount;
        if (lotAmount > remainingAmount) {
          lotAmount = remainingAmount;
        }
        costBasisPortion =
          (lot.costBasis / parseFloat(formatEther(lot.amount))) *
          parseFloat(formatEther(lotAmount));

        if (currencyRounded(lot.costBasis - costBasisPortion) < 0.0) {
          //Handle rare case where costBasis are negative due to rounding
          costBasisPortion = lot.costBasis;
        }
        //create a sold lot with zero proceeds and cost basis to track the transfer
        const soldLot = {
          account: lot.account,
          asset: lot.asset,
          buyTxId: lot.id,
          buyTxType: lot.type,
          buyTimestamp: lot.timestamp,
          id: tx.id,
          type: tx.type,
          timestamp: tx.timestamp,
          amount: lotAmount,
          costBasis: currencyRounded(costBasisPortion),
          proceeds: 0.0,
          gainLoss: 0.0,
          taxTxType: "SELL-TRANSFER",
        };
        soldLots.push(soldLot);
        lot.remainingAmount -= lotAmount;
        lot.remainingCostBasis =
          lot.remainingAmount == BigInt("0")
            ? 0.0
            : currencyRounded(lot.remainingCostBasis - costBasisPortion);

        //then "mini-BUY" into toAccount
        const newLot = {
          account: tx.toAccount,
          asset: tx.asset,
          buyTxId: lot.id,
          buyTxType: lot.type,
          timestamp: lot.timestamp,
          transferTimestamp: tx.timestamp,
          amount: lotAmount,
          remainingAmount: lotAmount,
          costBasis: currencyRounded(costBasisPortion),
          remainingCostBasis: currencyRounded(costBasisPortion),
          taxTxType: "BUY-TRANSFER",
          id: tx.id,
          type: tx.type,
        };

        undisposedLots.push(newLot);
        undisposedLots = undisposedLots.sort(sortByTimeStampThenSortThenId);

        if (lot.remainingAmount < BigInt("0")) {
          debugger;
          throw new Error("Lot remaining amount negative");
        }
        if (lot.remainingCostBasis < 0.0) {
          debugger;
          throw new Error("Lot remaining cost basis negative");
        }
        // if (typeof lotAmount !== "bigint") {
        //   debugger;
        // }
        // if (typeof remainingAmount !== "bigint") {
        //   debugger;
        // }
        remainingAmount -= lotAmount;
        if (remainingAmount == BigInt("0")) {
          verifyBalance(soldLot, runningBalances, undisposedLots, soldLots);

          verifyBalance(
            Object.assign({}, newLot, { timestamp: tx.timestamp }),
            runningBalances,
            undisposedLots,
            soldLots
          );
        }
        if (remainingAmount > BigInt("0")) {
          lot = findLot(
            {
              asset: tx.asset,
              account: tx.fromAccount,
            },
            undisposedLots
          );
        } else lot = null;
      }
      if (remainingAmount > BigInt("0")) {
        debugger;
        throw new Error(
          `Cannot find enough transfer inventory for ${tx.account}:${
            tx.asset
          }, amount remaining: ${formatEther(remainingAmount)}`
        );
      }
    }
  });

  return { heldLots: undisposedLots, soldLots };
}

export const useCostBasisStore = defineStore("costBasis", {
  getters: {
    costBasisData() {
      try {
        return getCostBasis();
      } catch (err) {
        console.error(err);
        throw err;
      }
      return [];
    },
  },
});
