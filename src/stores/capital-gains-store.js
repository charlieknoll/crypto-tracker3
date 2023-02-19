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

  buyTxs = buyTxs.concat(
    openingPositions.map((tx) => {
      const oTx = Object.assign({}, tx);
      oTx.gross = tx.amount * tx.price;
      return oTx;
    })
  );

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

function getCostBasisTxs(chainTransactions, offchainTransfers) {
  //gas Costs for transfers on chaintx
  let gasFeeTxs = chainTransactions.filter(
    (tx) =>
      tx.gasFee > 0.0 &&
      tx.txType == "C" &&
      tx.fromAccount.type == "Owned" &&
      tx.taxCode == "TRANSFER"
  );
  gasFeeTxs = gasFeeTxs.map((tx) => {
    const feeTx = Object.assign({}, tx);
    feeTx.timestamp = tx.timestamp - 1;
    feeTx.amount = tx.gasFee;
    feeTx.gross = tx.gasFee * tx.price;
    return feeTx;
  });

  //chainTx.fee for token transfers on chaintx
  let tokenTransferTxs = chainTransactions.filter(
    (tx) =>
      tx.taxCode == "TRANSFER" &&
      tx.amount != 0.0 &&
      tx.txType == "T" &&
      tx.fee > 0.0
  );
  tokenTransferTxs = tokenTransferTxs.map((tx) => {
    const ttx = Object.assign({}, tx);
    ttx.timestamp = tx.timestamp - 1;
    ttx.gross = tx.fee;
    return ttx;
  });
  //tokenFeeTxs
  let tokenFeeTxs = chainTransactions.filter((tx) => tx.txType == "F");

  //error fees for chaintx type = "C" to non token or spending or expense to gas asset
  let errorFeeTxs = chainTransactions.filter(
    (tx) =>
      tx.isError &&
      tx.gasFee > 0.0 &&
      tx.txType == "C" &&
      tx.fromAccount.type == "Owned" &&
      tx.toAccount.type != "Token"
  );
  errorFeeTxs = errorFeeTxs.map((tx) => {
    const feeTx = Object.assign({}, tx);
    feeTx.timestamp = tx.timestamp - 1;
    feeTx.amount = tx.gasFee;
    feeTx.gross = tx.gasFee * tx.price;
    return feeTx;
  });
  //error fees for chaintx type = "C" to token contract to token asset
  let tokenErrorFeeTxs = chainTransactions.filter(
    (tx) =>
      tx.isError &&
      tx.gasFee > 0.0 &&
      tx.txType == "C" &&
      tx.fromAccount.type == "Owned" &&
      tx.toAccount.type == "Token"
  );
  tokenErrorFeeTxs = tokenErrorFeeTxs.map((tx) => {
    const feeTx = Object.assign({}, tx);
    feeTx.timestamp = tx.timestamp - 1;
    //TODO if : in toacct then split and use [1] as asset
    let token = tx.toAccount.name?.split(":")[1];

    feeTx.asset = token ?? tx.toAccount.name;
    feeTx.amount = tx.gasFee;
    feeTx.gross = tx.gasFee * tx.price;
    return feeTx;
  });
  //offchain.fee for type == "TRANSFER" for offchainTx

  let offChainTransferTxs = offchainTransfers.filter(
    (tx) => (tx.type = "TRANSFER" && tx.fee > 0.0)
  );
  offChainTransferTxs = offChainTransferTxs.map((tx) => {
    const otx = Object.assign({}, tx);
    otx.timestamp = tx.timestamp - 1;
    otx.gross = tx.fee;
    return otx;
  });

  const txs = gasFeeTxs.concat(
    tokenTransferTxs,
    tokenFeeTxs,
    errorFeeTxs,
    tokenErrorFeeTxs,
    offChainTransferTxs
  );
  return txs;
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
    feeTx.proceeds = feeTx.gross;
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
    tx.taxTxType = "SELL";
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
    splitTx.allocatedId = buyTx.id;
    splitTx.sellId = tx.id;
    splitTx.id = tx.id;
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
function allocateCostBasis(tx, buyTxs) {
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

    const allocatedGross = (allocatedAmount / tx.amount) * tx.gross;

    tx.allocatedAmount += allocatedAmount;

    buyTx.cost += allocatedGross;

    i++;
    buyTx = buyTxs.find(
      (btx) =>
        btx.asset == tx.asset &&
        btx.disposedAmount < btx.amount &&
        btx.id != buyTx.id
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

  let costBasisTxs = getCostBasisTxs(chainTransactions, offchainTransfers);

  //Calc gains for each sell

  const splitTxs = [];
  const txs = sellTxs
    .concat(costBasisTxs)
    .sort((a, b) => a.timestamp - b.timestamp);
  for (const tx of txs) {
    if (tx.taxTxType == "SELL") {
      allocateProceeds(tx, buyTxs, splitTxs);
      if (includeWashSales) applyWashSale(tx, buyTxs, splitTxs);
    }

    if (!tx.taxTxType) {
      // if (tx.asset == "yDAI+yUSDC+yUSDT+yTUSD") {
      //   debugger;
      // }
      allocateCostBasis(tx, buyTxs);
    }
  }
  return { sellTxs, splitTxs };
}
export function getCapitalGains(applyWashSale) {
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
