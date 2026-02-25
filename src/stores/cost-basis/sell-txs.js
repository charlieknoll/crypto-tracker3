import { checkPrice, handleError } from "./verification";
import {
  currencyRounded,
  multiplyCurrency,
  floatToWei,
  floatToStrAbs,
} from "../../utils/number-helpers";
import { formatEther } from "ethers";

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
export function getSellTxs(
  chainTransactions,
  exchangeTrades,
  offchainTransfers,
  exchangeFees
) {
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
    checkPrice(tx.price, tx.asset, tx.timestamp, "USD");
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
    checkPrice(tx.price, tx.asset, tx.timestamp, "USD");
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
    checkPrice(tx.price, tx.asset, tx.timestamp, "USD");

    //feeTx.price = prices.getPrice(tx.feeCurrency, tx.date, tx.timestamp);
    feeTx.price = tx.price;
    feeTx.type = "OFFCHAIN-FEE";
    validateSellTx(feeTx, tx);
    _offChainFeeTxs.push(feeTx);
  }
  sellTxs = sellTxs.concat(_offChainFeeTxs);

  let offChainSellTxs = offchainTransfers.filter(
    (tx) =>
      tx.type != "FEE" &&
      tx.toAccount.toLowerCase() == "unrecoverable" &&
      tx.amount > 0.0
  );

  const _offChainSellTxs = [];

  for (const tx of offChainSellTxs) {
    const stx = {};
    stx.id = tx.id;
    //No need to handle wallet here, account is always a wallt for an exchange
    stx.account = tx.fromAccount;
    stx.asset = tx.asset;
    stx.timestamp = tx.timestamp;
    //fee is sold after transfer and his applied to the receiver's cost basis
    stx.sort = 0;
    stx.amount = floatToWei(tx.amount);
    stx.fee = 0.0;
    checkPrice(tx.price, tx.asset, tx.timestamp, "USD");

    // tx.price = prices.getPrice(tx.asset, tx.date, tx.timestamp);
    stx.price = tx.price ?? 0.0;
    stx.type = "OFFCHAIN-UNRECOVERABLE";
    validateSellTx(stx, tx);
    _offChainSellTxs.push(stx);
  }
  sellTxs = sellTxs.concat(_offChainSellTxs);

  const _exchangeFeeTxs = [];
  for (const tx of exchangeFees) {
    const stx = {};
    stx.id = tx.id;
    //No need to handle wallet here, account is always a wallt for an exchange
    stx.account = tx.account;
    stx.asset = tx.asset;
    stx.timestamp = Math.floor(tx.timestamp);
    //fee is sold after transfer and his applied to the receiver's cost basis
    stx.sort = 0;
    stx.amount = floatToWei(tx.amount);
    stx.fee = 0.0;
    checkPrice(tx.price, tx.asset, tx.timestamp, "USD");

    // tx.price = prices.getPrice(tx.asset, tx.date, tx.timestamp);
    stx.price = tx.price ?? 0.0;
    stx.type = "EXCHANGE-FEE-" + tx.type;
    validateSellTx(stx, tx);
    _exchangeFeeTxs.push(stx);
  }
  sellTxs = sellTxs.concat(_exchangeFeeTxs);

  sellTxs = sellTxs.map((tx) => {
    tx.proceeds = currencyRounded(
      multiplyCurrency([tx.price, parseFloat(formatEther(tx.amount))]) - tx.fee
    );
    if (tx.type === "GIFT-OUT") {
      //Gifts have no proceeds
      tx.proceeds = 0.0;
    }
    tx.remainingAmount = tx.amount; //BigInt
    tx.remainingProceeds = tx.proceeds;
    tx.taxTxType = "SELL";
    return tx;
  });
  return sellTxs;
}
