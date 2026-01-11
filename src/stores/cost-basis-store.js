import { parseEther } from "ethers";
import { defineStore } from "pinia";
import { multiplyCurrency } from "src/utils/number-helpers";
import { useOpeningPositionsStore } from "./opening-positions-store";
import { useOffchainTransfersStore } from "./offchain-transfers-store";
import { useChainTxsStore } from "./chain-txs-store";
import { useExchangeTradesStore } from "./exchange-trades-store";
import { formatEther } from "ethers";

const sortByTimeStampThenSort = (a, b) => {
  return a.timestamp == b.timestamp
    ? a.sort > b.sort
      ? 1
      : -1
    : a.timestamp - b.timestamp;
};

function validateCostBasisTx(tx) {
  if (!tx.account) {
    throw new Error("Cost basis tx missing account: " + JSON.stringify(tx));
  }
  if (!tx.timestamp) {
    throw new Error("Cost basis tx missing timestamp: " + JSON.stringify(tx));
  }
  if (!tx.asset) {
    throw new Error("Cost basis tx missing asset: " + JSON.stringify(tx));
  }
  if (tx.fee === undefined || tx.fee === null || isNaN(tx.fee)) {
    throw new Error("Cost basis tx missing fee: " + JSON.stringify(tx));
  }
  if (!tx.id) {
    throw new Error("Cost basis tx missing id: " + JSON.stringify(tx));
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
    validateCostBasisTx(tokenFeeTx);
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
    validateCostBasisTx(feeTx);
    return feeTx;
  });
  costBasisTxs = costBasisTxs.concat(exchangeFeeTxs);

  chainTransfers = chainTransactions.filter(
    (tx) => tx.taxCode == "TRANSFER" && !txisError && tx.fee > 0.0
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
    validateCostBasisTx(transferTx);
    return transferTx;
  });
  costBasisTxs = costBasisTxs.concat(chainTransfers);

  offchainTransfers = offchainTransfers.filter((tx) => tx.type == "TRANSFER");
  offchainTransfers = offchainTransfers.map((tx) => {
    const transferTx = {};
    transferTx.account = tx.toAccount;
    transferTx.timestamp = tx.timestamp;
    transferTx.sort = 1;
    transferTx.asset = tx.asset;
    transferTx.fee = tx.fee;
    transferTx.type = "OFFCHAIN-TRANSFER-FEE";
    transferTx.id = tx.id;
    validateCostBasisTx(transferTx);
    return transferTx;
  });
  costBasisTxs = costBasisTxs.concat(offchainTransfers);

  costBasisTxs = costBasisTxs.map((tx) => {
    tx.type = "COST-BASIS-FEE";
    return tx;
  });
}

function validateSellTx(tx) {
  if (!tx.account) {
    console.log(tx);
    throw new Error("Sell tx missing account: " + JSON.stringify(tx));
  }
  if (!tx.timestamp) {
    throw new Error("Sell tx missing timestamp: " + JSON.stringify(tx));
  }
  if (!tx.asset) {
    throw new Error("Sell tx missing asset: " + JSON.stringify(tx));
  }
  if (
    !tx.amount ||
    typeof tx.amount !== "bigint" ||
    parseFloat(formatEther(tx.amount)) <= 0.0
  ) {
    console.log(tx);
    throw new Error("Sell tx invalid amount: " + tx.amount);
  }
  if (
    tx.price === undefined ||
    tx.price === null ||
    isNaN(tx.price) ||
    tx.price < 0.0 ||
    (tx.type == "GIFT-OUT" && tx.price != 0.0)
  ) {
    throw new Error("Sell tx missing price: " + JSON.stringify(tx));
  }
  if (tx.fee === undefined || tx.fee === null || isNaN(tx.fee)) {
    throw new Error("Sell tx missing fee: " + JSON.stringify(tx));
  }
  if (tx.type === undefined || tx.type === null) {
    throw new Error("Sell tx missing type: " + JSON.stringify(tx));
  }
  if (!tx.id) {
    throw new Error("Sell tx missing id: " + JSON.stringify(tx));
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
    spendTx.price = tx.price;
    spendTx.fee = tx.fee;
    spendTx.type = tx.taxCode;
    spendTx.id = tx.id;
    validateSellTx(spendTx);
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
    validateSellTx(giftTx);
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
    sellAssetTx.price = tx.price;
    sellAssetTx.fee = tx.fee;
    sellAssetTx.type = "CHAIN-SELL";
    sellAssetTx.id = tx.id;
    validateSellTx(sellAssetTx);
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
    exchangeTx.amount = parseEther(tx.amount.toString()) ?? BigInt("0");
    exchangeTx.price = tx.price;
    exchangeTx.fee = tx.fee;
    exchangeTx.type = "EXCH-SELL";
    validateSellTx(exchangeTx);
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
    feeTx.price = tx.price;
    feeTx.type = "CHAIN-FEE";
    validateSellTx(feeTx);
    return feeTx;
  });
  sellTxs = sellTxs.concat(gasFeeTxs);

  let offChainFeeTxs = offchainTransfers.filter(
    (tx) => tx.type == "FEE" && tx.amount > 0.0
  );

  const _offChainFeeTxs = [];
  for (const tx of offChainFeeTxs) {
    //TODO fix
    const feeTx = {};
    feeTx.id = tx.id;
    //No need to handle wallet here, account is always a wallt for an exchange
    feeTx.account = tx.fromAccount;
    feeTx.asset = tx.asset;
    //TODO add sort intead of timestamp hack
    feeTx.timestamp = tx.timestamp;
    //fee is sold first, then the main tx sell should be handled after
    feeTx.sort = -1;
    feeTx.amount = parseEther(tx.amount.toString() ?? "0") ?? BigInt("0");
    feeTx.fee = 0.0;
    //feeTx.price = prices.getPrice(tx.feeCurrency, tx.date, tx.timestamp);
    feeTx.price = tx.price;
    feeTx.type = "CHAIN-FEE";
    debugger;
    validateSellTx(feeTx);
  }
  sellTxs = sellTxs.concat(_offChainFeeTxs);

  sellTxs = sellTxs.map((tx) => {
    tx.proceeds =
      multiplyCurrency([tx.price, parseFloat(formatEther(tx.amount))]) - tx.fee;
    tx.remainingAmount = tx.amount; //BigInt
    tx.remainingProceeds = tx.proceeds;
    tx.taxTxType = "SELL";
    return tx;
  });
  return sellTxs;
}
function validateBuyTx(tx) {
  if (!tx.account) {
    throw new Error("Buy tx missing account: " + JSON.stringify(tx));
  }
  if (!tx.timestamp) {
    throw new Error("Buy tx missing timestamp: " + JSON.stringify(tx));
  }
  if (!tx.asset) {
    throw new Error("Buy tx missing asset: " + JSON.stringify(tx));
  }
  if (!tx.amount || parseFloat(formatEther(tx.amount)) <= 0.0) {
    throw new Error("Buy tx missing amount: " + JSON.stringify(tx));
  }
  if (
    tx.price === undefined ||
    tx.price === null ||
    isNaN(tx.price) ||
    tx.price <= 0.0
  ) {
    throw new Error("Buy tx missing price: " + JSON.stringify(tx));
  }
  if (tx.fee === undefined || tx.fee === null || isNaN(tx.fee)) {
    throw new Error("Buy tx missing fee: " + JSON.stringify(tx));
  }
  if (!tx.id) {
    throw new Error("Buy tx missing id: " + JSON.stringify(tx));
  }
}
function getBuyTxs(chainTxs, exchangeTrades, openingPositions) {
  //TODO Add received gifts?

  let buyTxs = chainTxs.filter(
    (tx) =>
      tx.taxCode == "BUY" ||
      tx.taxCode == "INCOME" ||
      (tx.taxCode == "EXPENSE REFUND" && tx.value > BigInt("0") && !tx.isError)
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
    validateBuyTx(buyTx);
    return buyTx;
  });
  let giftTxs = chainTxs.filter(
    (tx) => tx.taxCode == "GIFT-IN" && tx.value > BigInt("0") && !tx.isError
  );
  giftTxs = buyTxs.map((tx) => {
    const buyTx = {};
    buyTx.account = tx.toWalletName ?? tx.toAccountName;
    buyTx.timestamp = tx.timestamp;
    buyTx.asset = tx.asset;
    buyTx.amount = BigInt(tx.value);

    buyTx.price = tx.price;
    buyTx.fee = 0.0;
    buyTx.id = tx.id;
    buyTx.type = "CHAIN-" + tx.taxCode;
    validateBuyTx(buyTx);
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

    buyTx.amount = parseEther(tx.amount.toString()) ?? BigInt("0");
    buyTx.price = tx.price;
    buyTx.fee = tx.fee;
    buyTx.id = tx.id;
    buyTx.type = "EXCH-" + tx.taxCode;
    validateBuyTx(buyTx);
    return buyTx;
  });
  buyTxs = buyTxs.concat(_buyExchangeTrades);

  let _openingPostions = openingPositions.map((tx) => {
    const oTx = {};
    oTx.account = tx.account;
    oTx.timestamp = tx.timestamp;
    oTx.asset = tx.asset;
    oTx.amount = parseEther(tx.amount.toString());
    oTx.price = tx.price;
    oTx.fee = tx.fee;
    oTx.id = tx.id;
    oTx.type = "OPENING-POSITION";
    validateBuyTx(buyTx);
    return oTx;
  });
  buyTxs = buyTxs.concat(_openingPostions);

  buyTxs = buyTxs.map((tx) => {
    tx.taxTxType = "BUY";
    tx.gross = multiplyCurrency([tx.price, parseFloat(formatEther(tx.amount))]);
    tx.costBasis = +tx.gross + +tx.fee;
    tx.remainingAmount = tx.amount ?? BigInt("0.0");
    tx.remainingCostBasis = tx.costBasis;
    return tx;
  });

  return buyTxs;
}
function validateTransferTx(tx) {
  if (!tx.fromAccount) {
    throw new Error("Transfer tx missing fromAccount: " + JSON.stringify(tx));
  }
  if (!tx.toAccount) {
    throw new Error("Transfer tx missing toAccount: " + JSON.stringify(tx));
  }
  if (!tx.timestamp) {
    throw new Error("Transfer tx missing timestamp: " + JSON.stringify(tx));
  }
  if (!tx.asset) {
    throw new Error("Transfer tx missing asset: " + JSON.stringify(tx));
  }
  if (!tx.amount || parseFloat(formatEther(tx.amount)) <= 0.0) {
    throw new Error("Transfer tx missing amount: " + JSON.stringify(tx));
  }
  if (!tx.id) {
    throw new Error("Transfer tx missing id: " + JSON.stringify(tx));
  }
  if (!tx.type) {
    throw new Error("Transfer tx missing type: " + JSON.stringify(tx));
  }
  if (tx.fee === undefined || tx.fee === null || isNaN(tx.fee)) {
    throw new Error("Transfer tx missing fee: " + JSON.stringify(tx));
  }
}
function getTransferTxs(chainTransactions, offchainTransfers) {
  //TODO
  let transferTxs = [];

  chainTransfers = chainTransactions.filter(
    (tx) => tx.taxCode == "TRANSFER" && !txisError
  );
  chainTransfers = chainTransfers.map((tx) => {
    const transferTx = {};
    transferTx.fromAccount = tx.fromWalletName ?? tx.fromAccountName;
    transferTx.toAccount = tx.toWalletName ?? tx.toAccountName;
    transferTx.timestamp = tx.timestamp;
    transferTx.asset = tx.asset;
    transferTx.amount = tx.value ?? BigInt("0");
    transferTx.type = "CHAIN-TRANSFER";
    transferTx.id = tx.id;
    validateTransferTx(transferTx);
    return transferTx;
  });
  transferTxs = transferTxs.concat(chainTransfers);

  offchainTransfers = offchainTransfers.filter((tx) => tx.type == "TRANSFER");
  offchainTransfers = offchainTransfers.map((tx) => {
    const transferTx = {};
    transferTx.fromAccount = tx.fromWalletName ?? tx.fromAccountName;
    transferTx.toAccount = tx.toWalletName ?? tx.toAccountName;
    transferTx.timestamp = tx.timestamp;
    transferTx.asset = tx.asset;
    transferTx.amount = parseEther(tx.amount.toString()) ?? BigInt("0");
    transferTx.type = "OFFCHAIN-TRANSFER";
    transferTx.id = tx.id;
    validateTransferTx(transferTx);
    return transferTx;
  });
  transferTxs = transferTxs.concat(offchainTransfers);
  return transferTxs;
}
function findLot(tx, undisposedLots) {
  return undisposedLots.find(
    (lot) =>
      lot.asset == tx.asset &&
      lot.account == tx.account &&
      lot.remainingAmount > BigInt("0")
  );
}

function getCostBasis() {
  //raw from localStorage
  const openingPositions = useOpeningPositionsStore().records;

  const offchainTransfers = useOffchainTransfersStore().split;

  const chainTransactions = useChainTxsStore().accountTxs;

  const exchangeTrades = useExchangeTradesStore().split;
  //TODO this probably will include rewards for Kraken
  const exchangeFees = useExchangeTradesStore().fees;

  let sellTxs = getSellTxs(
    chainTransactions,
    exchangeTrades,
    offchainTransfers
  );
  let buyTxs = getBuyTxs(chainTransactions, exchangeTrades, openingPositions);

  let costBasisTxs = getCostBasisTxs(
    chainTransactions,
    offchainTransfers,
    exchangeFees
  );

  let transferTxs = getTransferTxs(chainTransactions, offchainTransfers);

  const undisposedLots = [];
  const soldLots = [];

  //Merge all txs and sort by timestamp
  let mappedData = [];
  mappedData = mappedData.concat(sellTxs);
  mappedData = mappedData.concat(buyTxs);
  mappedData = mappedData.concat(costBasisTxs);
  mappedData = mappedData.concat(transferTxs);
  mappedData = mappedData.sort(sortByTimeStampThenSort);
  mappedData.forEach((tx) => {
    //TODO handle account/wallet cutover timestamp by resetting walletName on undisposedLots
    if (tx.action.substring(0, 3) === "BUY") {
      undisposedLots.push(tx);
    }
    if (tx.action === "SELL") {
      let remainingAmount = tx.amount;
      let remainingProceeds = tx.proceeds;
      let lot = findLot(tx);
      while (remainingAmount > 0 && lot) {
        let lotAmount = lot.remainingAmount;
        if (lotAmount > remainingAmount) {
          lotAmount = remainingAmount;
        }
        const costBasisPortion =
          (lot.costBasis / parseFloat(formatEther(lot.amount))) *
          parseFloat(formatEther(lotAmount));
        const proceedsPortion =
          (tx.proceeds / parseFloat(formatEther(tx.amount))) *
          parseFloat(formatEther(lotAmount));
        const soldLot = {
          account: tx.account,
          asset: tx.asset,
          buyTxId: lot.id,
          buyTxType: lot.type,
          sellTxId: tx.id,
          sellTxType: tx.type,
          buyTimestamp: lot.timestamp,
          sellTimestamp: tx.timestamp,
          amount: lotAmount,
          costBasis: costBasisPortion,
          proceeds: proceedsPortion,
          gainLoss: proceedsPortion - costBasisPortion,
        };
        soldLots.push(soldLot);
        debugger;
        //TOOD check that bigint works here
        lot.remainingAmount -= lotAmount;
        lot.remainingCostBasis -= costBasisPortion;

        remainingAmount -= lotAmount;
        remainingProceeds -= proceedsPortion;
        if (lot.remainingAmount < BigInt("0")) {
          debugger;
          throw new Error("Lot remaining amount negative");
        }
        if (lot.remainingCostBasis < 0.0) {
          debugger;
          throw new Error("Lot remaining cost basis negative");
        }
        if (remainingAmount > BigInt("0")) {
          lot = findLot(tx, undisposedLots);
        } else lot = null;
      }
    }
    if (tx.action === "COST-BASIS-FEE") {
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
        debugger;
        //TODO check this is working
        lot.costBasis += costBasisPortion;
        lot.remainingCostBasis += costBasisPortion;
      }
    }
    if (tx.action === "TRANSFER") {
      //first "mini-SELL" from fromAccount
      let remainingAmount = tx.amount;
      let lot = findLot(
        {
          asset: tx.asset,
          account: tx.fromAccount,
        },
        undisposedLots
      );
      while (remainingAmount > 0 && lot) {
        let lotAmount = lot.remainingAmount;
        if (lotAmount > remainingAmount) {
          lotAmount = remainingAmount;
        }
        const costBasisPortion =
          (lot.costBasis / parseFloat(formatEther(lot.amount))) *
          parseFloat(formatEther(lotAmount));
        //create a sold lot with zero proceeds and cost basis to track the transfer
        // const soldLot = {
        //   account: lot.account,
        //   asset: lot.asset,
        //   buyTxId: lot.id,
        //   buyTxType: lot.type,
        //   sellTxId: tx.id,
        //   sellTxType: tx.type,
        //   buyTimestamp: lot.timestamp,
        //   sellTimestamp: tx.timestamp,
        //   amount: lotAmount,
        //   //calc used cost basis portion
        //   costBasis: costBasisPortion,
        //   proceeds: 0.0,
        //   gainLoss: 0.0,
        //   type: "TRANSFER",
        // };
        //soldLots.push(soldLot);
        debugger;
        //TOOD check that bigint works here
        lot.remainingAmount -= lotAmount;
        lot.remainingCostBasis -= costBasisPortion;

        remainingAmount -= lotAmount;
        if (lot.remainingAmount < BigInt("0")) {
          debugger;
          throw new Error("Lot remaining amount negative");
        }
        if (lot.remainingCostBasis < 0.0) {
          debugger;
          throw new Error("Lot remaining cost basis negative");
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
      //then "mini-BUY" into toAccount
      const transferredAmount = tx.amount - remainingAmount;
      if (transferredAmount > BigInt("0")) {
        const newLot = {
          account: tx.toAccount,
          asset: tx.asset,
          timestamp: tx.timestamp,
          amount: transferredAmount,
          remainingAmount: transferredAmount,
          costBasis: costBasisPortion,
          remainingCostBasis: 0.0,
          type: "BUY-TRANSFER",
          id: tx.id,
        };
        undisposedLots.push(newLot);
      }
    }
  });
  //TODO filter out full disposed lots
  return { undisposedLots, soldLots };
}

export const useCostBasisStore = defineStore("costBasis", {
  getters: {
    costBasis() {
      try {
        return getCostBasis();
      } catch (err) {
        console.error(err);
        debugger;
      }
      return [];
    },
  },
});
