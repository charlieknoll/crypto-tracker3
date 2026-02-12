import { handleError } from "./verification";
import {
  currencyRounded,
  multiplyCurrency,
  floatToWei,
  floatToStrAbs,
} from "../../utils/number-helpers";
import { formatEther } from "ethers";

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
export function getBuyTxs(chainTxs, exchangeTrades, openingPositions) {
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
