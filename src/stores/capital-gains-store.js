import { useChainTxsStore } from "src/stores/chain-txs-store";
import { useExchangeTradesStore } from "src/stores/exchange-trades-store";
import { useOffchainTransfersStore } from "src/stores/offchain-transfers-store";
import { useOpeningPositionsStore } from "src/stores/opening-positions-store";
import { defineStore } from "pinia";

const sortByTimeStampThenTxId = (a, b) => {
  return a.timestamp == b.timestamp
    ? a.txId > b.txId
      ? 1
      : -1
    : a.timestamp - b.timestamp;
};
function getBuyTxs(chainTxs, exchangeTrades, openingPositions) {
  //TODO Add received gifts?
  let buyTxs = chainTxs.filter(
    (tx) => (tx.taxCode == "BUY" || tx.taxCode == "INCOME") && tx.amount > 0.0
  );
  buyTxs = buyTxs.map((tx) => {
    const buyTx = Object.assign({}, tx);
    buyTx.account = tx.fromName;
    return buyTx;
  });

  let _buyExchangeTrades = exchangeTrades.filter((tx) => tx.action == "BUY");
  buyTxs = buyTxs.concat(_buyExchangeTrades);

  buyTxs = buyTxs.concat(openingPositions);

  buyTxs = buyTxs.map((tx) => {
    tx.cost = tx.gross + tx.fee;
    tx.disposedAmount = 0.0;
    tx.adjDaysHeld = 0.0;
    tx.sellTxId = "";
    return tx;
  });
  buyTxs.sort((a, b) => a.timestamp - b.timestamp);
  return buyTxs;
}
function getSellTxs(chainTransactions, exchangeTrades, offchainTransfers) {
  let sellTxs = [];

  //TODO proceeds = gross
  let spendTxs = chainTransactions.filter(
    (tx) => (tx.taxCode == "SPENDING" || tx.taxCode == "EXPENSE") && !tx.isError
  );
  spendTxs = spendTxs.map((tx) => {
    const spendTx = Object.assign({}, tx);
    spendTx.proceeds = spendTx.gross;
    return spendTx;
  });

  //Track this to properly track cost basis of gifts
  // proceeds = 0, ignore on final report since it is given away
  let giftTxs = chainTransactions.filter(
    (tx) => tx.taxCode == "GIFT" && !tx.isError && tx.fromName != "GENESIS"
  );
  giftTxs = giftTxs.map((tx) => {
    const giftTx = Object.assign({}, tx);
    giftTx.proceeds = 0.0;
    return giftTx;
  });

  //TODO proceeds = gross - fee, fee will always be usd and this will always be a token tx
  let sellAssetTxs = chainTransactions.filter(
    (tx) => tx.taxCode == "SELL" && tx.amount != 0.0
  );
  sellAssetTxs = sellAssetTxs.map((tx) => {
    const sellAssetTx = Object.assign({}, tx);
    sellAssetTx.proceeds = sellAssetTx.gross - sellAssetTx.fee;
    return sellAssetTx;
  });

  //get tokens spent as fees
  //TODO proceeds = gross
  let tokenFeeTxs = chainTransactions.filter((tx) => tx.txType == "F");

  //Build list and assign account and action

  sellTxs = sellTxs.concat(spendTxs);
  sellTxs = sellTxs.concat(giftTxs);
  sellTxs = sellTxs.concat(sellAssetTxs);
  sellTxs = sellTxs.concat(tokenFeeTxs);
  sellTxs = sellTxs.map((tx) => {
    tx.account = tx.fromAccountName;
    tx.action = tx.taxCode;
    return tx;
  });
  //TODO proceeds = gross - fee
  let exchangeTxs = exchangeTrades.filter((tx) => tx.action == "SELL");
  exchangeTxs = exchangeTxs.map((tx) => {
    const exchangeTx = Object.assign({}, tx);
    exchangeTx.proceeds = exchangeTx.net;
    return exchangeTx;
  });

  sellTxs = sellTxs.concat(exchangeTxs);

  //get gasFees spent
  let gasFeeTxs = chainTransactions.filter(
    (tx) =>
      tx.gasFee > 0.0 && tx.txType == "C" && tx.fromAccount.type == "Owned"
  );
  //TODO these are just sells, worry about cost basis effects
  gasFeeTxs = gasFeeTxs.map((tx) => {
    const feeTx = Object.assign({}, tx);
    feeTx.timestamp = tx.timestamp - 1;
    feeTx.amount = tx.gasFee;
    feeTx.fee = 0.0;
    feeTx.gross = tx.gasFee * tx.price;
<<<<<<< HEAD
    feeTx.proceeds = feeTx.gross;
=======
>>>>>>> 0697ba873fb2e0d0fa758047c71f1fe5e8436821
    feeTx.action = "FEE";
    feeTx.account = feeTx.fromAccountName;
    return feeTx;
  });

  sellTxs = sellTxs.concat(gasFeeTxs);

  let offChainFeeTxs = offchainTransfers.filter((tx) => tx.type == "FEE");
  const _offChainFeeTxs = [];
  for (const tx of offChainFeeTxs) {
    //TODO fix
    tx.gross = tx.fee;
    tx.proceeds = tx.gross;
    tx.action = "TF:" + tx.asset;
    tx.fee = 0.0;
    tx.asset = tx.asset;
    _offChainFeeTxs.push(tx);
  }
  sellTxs = sellTxs.concat(_offChainFeeTxs);
  sellTxs = sellTxs.map((tx) => {
    tx.allocatedAmount = 0.0;
    tx.feeAllocatedAmount = 0.0;
    tx.shortTermGain = 0.0;
    tx.longTermGain = 0.0;
    tx.longLots = 0;
    tx.shortLots = 0;
    return tx;
  });
  sellTxs.sort((a, b) => a.timestamp - b.timestamp);
  return sellTxs;
}
function allocateProceeds(tx, buyTxs, splitTxs) {
  let buyTx = buyTxs.find(
    (btx) => btx.asset == tx.asset && btx.disposedAmount < btx.amount
  );
  //TODO adjust cost basis for fees from sale tx
  let i = 0;
  // if (tx.asset == "ETH") {
  //   debugger;
  // }
  while (tx.allocatedAmount != tx.amount && buyTx && i < 100) {
    const remainingAmount = tx.amount - tx.allocatedAmount;
    const allocatedAmount =
      remainingAmount <= buyTx.amount - buyTx.disposedAmount
        ? remainingAmount
        : buyTx.amount - buyTx.disposedAmount;
    buyTx.disposedAmount += allocatedAmount;
    tx.allocatedAmount += allocatedAmount;
    buyTx.sellTxId = tx.txId;
    //TODO determine long vs short
    const daysHeld =
      (new Date(tx.date).getTime() - new Date(buyTx.date).getTime()) /
        1000 /
        60 /
        60 /
        24 +
      buyTx.adjDaysHeld;
    let gain =
      (allocatedAmount / tx.amount) * tx.proceeds -
      (allocatedAmount / buyTx.amount) * buyTx.cost;
    let proceeds = (allocatedAmount / tx.amount) * tx.proceeds;
    let costBasis = (allocatedAmount / buyTx.amount) * buyTx.cost;
    let realizedType = "";
    let fee = 0.0;
    if (tx.action == "GIFT") {
      gain = 0.0;
      proceeds = 0.0;
      fee = tx.fee * (allocatedAmount / tx.amount);
      realizedType = "GIFT";
    }
    if (daysHeld > 365) {
      tx.longTermGain += gain;
      tx.longLots += 1;
    } else {
      tx.shortTermGain += gain;
      tx.shortLots += 1;
    }
    //TODO create split tx
    const splitTx = {};
    splitTx.description = "" + allocatedAmount + " " + buyTx.asset;
    splitTx.asset = buyTx.asset;
    splitTx.longShort = daysHeld > 365 ? "Long" : "Short";
    splitTx.dateAcquired = buyTx.date;
    splitTx.allocatedTxId = buyTx.txId;
    splitTx.sellTxId = tx.txId;
    splitTx.txId = tx.txId;
    splitTx.daysHeld = daysHeld;
    splitTx.date = tx.date;
    splitTx.amount = allocatedAmount;
    splitTx.proceeds = proceeds;
    splitTx.cost = costBasis;
    splitTx.fee = fee;
    splitTx.price = costBasis / allocatedAmount;
    splitTx.costBasis = fee + splitTx.cost;
    splitTx.toName = tx.toName;
    splitTx.realizedType = realizedType;
    splitTx.gainOrLoss = gain;
    splitTx.washSaleAdj = 0.0;
    splitTxs.push(splitTx);
    i++;
    buyTx = buyTxs.find(
      (btx) => btx.asset == tx.asset && btx.disposedAmount < btx.amount
    );
  }
}
function allocateFee(tx, buyTxs) {
  let buyTx = buyTxs.find(
    (btx) => btx.asset == tx.asset && btx.disposedAmount < btx.amount
  );
  //TODO adjust cost basis for fees from sale tx
  let i = 0;

  //reset allocated
  tx.allocatedAmount = 0.0;
  while (tx.allocatedAmount != tx.amount && buyTx && i < 100) {
    const remainingAmount = tx.amount - tx.allocatedAmount;
    const allocatedAmount =
      remainingAmount <= buyTx.amount - buyTx.disposedAmount
        ? remainingAmount
        : buyTx.amount - buyTx.disposedAmount;

    const allocatedProceeds = (allocatedAmount / tx.amount) * tx.proceeds;

    tx.allocatedAmount += allocatedAmount;

    buyTx.cost += allocatedProceeds;

    i++;
    buyTx = buyTxs.find(
      (btx) =>
        btx.asset == tx.asset &&
        btx.disposedAmount < btx.amount &&
        btx.txId != buyTx.txId
    );
  }
}
function getAllocatedTxs(includeWashSales) {
  const openingPositions = useOpeningPositionsStore().records;
  const offchainTransfers = useOffchainTransfersStore().split;
  const chainTransactions = useChainTxsStore().accountTxs;
  const exchangeTrades = useExchangeTradesStore().split;

  let sellTxs = getSellTxs(
    chainTransactions,
    exchangeTrades,
    offchainTransfers
  );
  let buyTxs = getBuyTxs(chainTransactions, exchangeTrades, openingPositions);

  // let ethTxs = sellTxs.filter((tx) => tx.asset == "ETH");
  // let ethSellTotal = 0.0;
  // ethTxs.map((tx) => (ethSellTotal += tx.amount));
  // let buyEthTxs = buyTxs.filter((tx) => tx.asset == "ETH");
  // let ethBuyTotal = 0.0;
  // buyEthTxs.map((tx) => (ethBuyTotal += tx.amount));

  //Calc gains for each sell

  const splitTxs = [];
  //TODO allocate fees for token transfers, token contract interactions (type = "C" with 0 tokenTx to token contract)
  //TODO include TF:  of type "F" from chain tx's

  for (const tx of sellTxs) {
    if (tx.action != "TOKEN FEE") {
      allocateProceeds(tx, buyTxs, splitTxs);
      if (includeWashSales) applyWashSale(tx, buyTxs, splitTxs);
    }
    //IMPORTANT, TRANSFER FEES timestamp adjusted -1 so the fees get applied first
    // if (tx.action == "TRANSFER FEE") {
    //   debugger;
    //   allocateFee(tx, buyTxs);
    // }
    //Only increase cost basis for tx's that did not transfer tokens (approve), token transfers, buys and
    //sells will be applied to the token cost basis
    if (tx.action && tx.action.includes("TF:")) {
      const _tx = Object.assign({}, tx);
      _tx.asset = tx.action.split(":")[1];
      allocateFee(_tx, buyTxs);
    }
    if (
      tx.action == "TOKEN FEE"
      // tx.action == "TOKEN FEE" &&
      // tokenTxs.findIndex(tt => tt.parentTx.hash == tx.hash) == -1
    ) {
      allocateTokenFee(tx, buyTxs);
    }
  }
  return { sellTxs, splitTxs };
}
function getCapitalGains(applyWashSale) {
  const allocatedTxs = getAllocatedTxs(applyWashSale);
  const sellTxs = allocatedTxs.sellTxs.filter((tx) => tx.action != "GIFT");
  const splitTxs = allocatedTxs.splitTxs.filter(
    (tx) => tx.realizedType != "GIFT"
  );
  return { sellTxs, splitTxs };
}
export const useCapitalGainsStore = defineStore("capitalGains", {
  getters: {
    capitalGains: () => getCapitalGains(false),
    capitalGainsWithWashSale: () => getCapitalGains(true),
  },
});
