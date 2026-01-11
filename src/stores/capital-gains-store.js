import { useChainTxsStore } from "src/stores/chain-txs-store";
import { useExchangeTradesStore } from "src/stores/exchange-trades-store";
import { useOffchainTransfersStore } from "src/stores/offchain-transfers-store";
import { useOpeningPositionsStore } from "src/stores/opening-positions-store";
import { defineStore } from "pinia";
import constants from "../constants"; //
//import { parseEther } from "ethers";
import { sBnToFloat } from "src/utils/number-helpers";

const sortByTimeStampThenTxId = (a, b) => {
  return a.timestamp == b.timestamp
    ? a.txId > b.txId
      ? 1
      : -1
    : a.timestamp - b.timestamp;
};
const sortByTimeStampThenSort = (a, b) => {
  return a.timestamp == b.timestamp
    ? a.sort > b.sort
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
      oTx.account = "OPENING";
      return oTx;
    })
  );

  buyTxs = buyTxs.map((tx) => {
    tx.costBasis = +tx.gross + +tx.fee;
    tx.adjDaysHeld = 0.0;
    tx.sellTxId = "";
    //TODO test bigNumber support on disposed amount
    tx.disposedAmount = 0.0;
    tx.disposedCostBasis = 0.0;
    return tx;
  });
  buyTxs.sort((a, b) => a.timestamp - b.timestamp);
  return buyTxs;
}

function getCostBasisTxs(chainTransactions, offchainTransfers) {
  //gas Costs for transfers on chaintx
  let gasFeeTxs = chainTransactions.filter(
    (tx) =>
      tx.gasFee > BigInt("0") &&
      tx.txType == "C" &&
      tx.fromAccount.type == "Owned" &&
      tx.taxCode == "TRANSFER"
  );
  gasFeeTxs = gasFeeTxs.map((tx) => {
    const feeTx = Object.assign({}, tx);
    feeTx.timestamp = tx.timestamp - 1;
    feeTx.amount = sBnToFloat(tx.gasFee);
    feeTx.value = tx.gasFee;
    feeTx.costBasisAdj = tx.amount * tx.price;
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
    ttx.costBasisAdj = +tx.fee ?? 0.0;
    return ttx;
  });
  //tokenFeeTxs
  let tokenFeeTxs = chainTransactions.filter((tx) => tx.txType == "F");

  //error fees for chaintx type = "C" to non token or spending or expense to gas asset
  let errorFeeTxs = chainTransactions.filter(
    (tx) =>
      tx.isError &&
      tx.gasFee > BigInt("0") &&
      tx.txType == "C" &&
      tx.fromAccount.type == "Owned" &&
      tx.toAccount.type != "Token"
  );
  errorFeeTxs = errorFeeTxs.map((tx) => {
    const feeTx = Object.assign({}, tx);
    feeTx.timestamp = tx.timestamp - 1;
    feeTx.amount = sBnToFloat(tx.gasFee);
    feeTx.value = tx.gasFee;
    feeTx.costBasisAdj = tx.amount * tx.price;
    return feeTx;
  });
  //error fees for chaintx type = "C" to token contract to token asset
  let tokenErrorFeeTxs = chainTransactions.filter(
    (tx) =>
      tx.isError &&
      tx.gasFee > BigInt("0") &&
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
    feeTx.amount = sBnToFloat(tx.gasFee);
    feeTx.costBasisAdj = tx.amount * tx.price;
    return feeTx;
  });
  //offchain.fee for type == "TRANSFER" for offchainTx

  let offChainTransferTxs = offchainTransfers.filter(
    (tx) => tx.type == "TRANSFER" && tx.fee > 0.0
  );
  offChainTransferTxs = offChainTransferTxs.map((tx) => {
    const otx = Object.assign({}, tx);
    otx.timestamp = tx.timestamp - 1;
    otx.costBasisAdj = tx.fee;
    return otx;
  });

  const txs = gasFeeTxs.concat(
    tokenTransferTxs,
    tokenFeeTxs,
    errorFeeTxs,
    tokenErrorFeeTxs,
    offChainTransferTxs
  );
  txs.map((tx) => {
    tx.disposedAmount = 0.0;
    tx.taxTxType = "COST_BASIS_ADJ";
    return tx;
  });
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
    spendTx.cgId = spendTx.id + "-spend";
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
    giftTx.cgId = giftTx.id + "-gift";
    return giftTx;
  });

  //TODO proceeds = gross - fee, fee will always be usd and this will always be a token tx
  let sellAssetTxs = chainTransactions.filter(
    (tx) => tx.taxCode == "SELL" && tx.amount != 0.0
  );
  sellAssetTxs = sellAssetTxs.map((tx) => {
    const sellAssetTx = Object.assign({}, tx);
    sellAssetTx.proceeds = sellAssetTx.gross - sellAssetTx.fee;
    sellAssetTx.cgId = sellAssetTx.id + "-sellAsset";
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
    feeTx.amount = sBnToFloat(tx.gasFee);
    feeTx.fee = 0.0;
    feeTx.gross = feeTx.amount * tx.price;
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
    const feeTx = Object.assign({}, tx);
    feeTx.gross = tx.fee;
    feeTx.proceeds = feeTx.gross;
    feeTx.action = "TF:" + tx.asset;
    feeTx.fee = 0.0;
    feeTx.asset = tx.asset;
    _offChainFeeTxs.push(feeTx);
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
  sellTxs.sort(sortByTimeStampThenSort);
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
    buyTx.disposedCostBasis +=
      (allocatedAmount / +buyTx.amount) * buyTx.costBasis;

    //TODO add array of sellTxIds to buyTx?
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
      (allocatedAmount / buyTx.amount) * buyTx.costBasis;
    let proceeds = (allocatedAmount / +tx.amount) * tx.proceeds;
    let costBasis = (allocatedAmount / +buyTx.amount) * buyTx.costBasis;
    //TODO figure out where these come from
    let costBasisFees =
      (allocatedAmount / buyTx.amount) * (buyTx.costBasisFees ?? 0.0);
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
    splitTx.costBasisFees = costBasisFees;
    splitTx.sellId = tx.id;
    splitTx.id = tx.id;
    splitTx.timestamp = tx.timestamp;
    splitTx.daysHeld = daysHeld;
    splitTx.date = tx.date;
    splitTx.amount = allocatedAmount;
    splitTx.proceeds = proceeds;
    splitTx.costBasis = costBasis;
    splitTx.fee = fee;
    splitTx.price = costBasis / allocatedAmount;
    splitTx.costBasis = fee + splitTx.costBasis;
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
  //TODO this should allocate equally to all non disposed assets and on a wallet basis if after 1/1/2025
  //Get undisposed buys for the asset
  buyTxs = buyTxs.filter(
    (btx) =>
      btx.asset == tx.asset &&
      btx.disposedAmount < btx.amount &&
      tx.timestamp >= btx.timestamp
  );
  //get total undisposed amount
  const totalUndisposed = buyTxs.reduce(
    (sum, btx) => sum + (btx.amount - (btx.disposedAmount ?? 0.0)),
    0.0
  );
  buyTxs.map((btx) => {
    const undisposed = btx.amount - (btx.disposedAmount ?? 0.0);

    btx.costBasis += (undisposed / totalUndisposed) * (tx.costBasisAdj ?? 0.0);
  });
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
  const txs = sellTxs.concat(costBasisTxs).sort(sortByTimeStampThenSort);
  for (const tx of txs) {
    if (tx.taxTxType == "SELL") {
      allocateProceeds(tx, buyTxs, splitTxs);
      if (includeWashSales) applyWashSale(tx, buyTxs, splitTxs);
    }

    //TODO check this works correctly, not sure how
    //this assumes that costBasisTxs don't have taxTxType set, how does this handle fees on non USD sells?
    if (tx.taxTxType == "COST_BASIS_ADJ") {
      // if (tx.asset == "yDAI+yUSDC+yUSDT+yTUSD") {
      //   debugger;
      // }
      allocateCostBasis(tx, buyTxs);
      //console.log("Test wallet timestamp:" + constants.WALLET_TIMESTAMP_CUTOFF);
    }
  }
  //TODO add cost basis field
  const unrealized = buyTxs
    .filter((tx) => tx.amount > tx.disposedAmount)
    .map((tx) => {
      tx.unrealizedAmount = tx.amount - tx.disposedAmount;
      tx.costBasis = tx.costBasis - tx.disposedCostBasis;
      return tx;
    });

  return { sellTxs, splitTxs, unrealized };
}
export function getCapitalGains(applyWashSale) {
  //TODO this needs to be reworked
  // build a list of buys, transfers and sells
  // switch on txType
  // for transfers, "mini sell" the transfer amount and "mini buy" it preserving acquisition date and adding fees to cost basis
  // one sell that disposes multiple buys should create multiple capital gains entries
  // Also support wallet vs asset allocation modes switching 1/1/2025
  // for interwallet transfers assign the cost basis to the receiving wallet

  const allocatedTxs = getAllocatedTxs(applyWashSale);
  const sellTxs = allocatedTxs.sellTxs.filter((tx) => tx.action != "GIFT");
  //"splitTxs" are the detailed allocations of each sell to buys
  const splitTxs = allocatedTxs.splitTxs.filter(
    (tx) => tx.realizedType != "GIFT"
  );
  return { sellTxs, splitTxs, unrealized: allocatedTxs.unrealized };
}
export const useCapitalGainsStore = defineStore("capitalGains", {
  getters: {
    capitalGains: () => getCapitalGains(false),
    capitalGainsWithWashSale: () => getCapitalGains(true),
  },
});
