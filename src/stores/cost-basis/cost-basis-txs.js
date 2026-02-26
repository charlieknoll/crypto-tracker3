import { verifyAssetBalance, checkPrice, handleError } from "./verification";
import {
  currencyRounded,
  multiplyCurrency,
  floatToWei,
  floatToStrAbs,
} from "../../utils/number-helpers";

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

export function getCostBasisTxs(
  chainTransactions,
  offchainTransfers,
  exchangeFees
) {
  let costBasisTxs = [];
  //token fee txs are eth fees paid on token interactions, not buy/sell txs
  //they should be added to cost basis of the token tx they are associated with
  //and costbasis should be distributed evenly across all tokens in the account at time
  //TODO move to cost basis calculation
  let tokenFeeTxs = chainTransactions.filter(
    (tx) => tx.txType == "F" || tx.taxCode.substring(0, 3) == "TF:"
  );
  tokenFeeTxs = tokenFeeTxs.map((tx) => {
    const tokenFeeTx = {};
    tokenFeeTx.account = tx.fromWalletName ?? tx.fromAccountName;
    tokenFeeTx.timestamp = tx.timestamp;
    //assign cost basis after initiating tx
    tokenFeeTx.sort = 1;
    tokenFeeTx.asset =
      tx.taxCode.substring(0, 3) == "TF:" ? tx.taxCode.substring(3) : tx.asset;
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
