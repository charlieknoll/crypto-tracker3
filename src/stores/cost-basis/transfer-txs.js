import { checkPrice, handleError } from "./verification";
import {
  currencyRounded,
  multiplyCurrency,
  floatToWei,
  floatToStrAbs,
} from "../../utils/number-helpers";
import { formatEther } from "ethers";
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
export function getTransferTxs(chainTransactions, offchainTransfers) {
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
    transferTx.type = tx.type;
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
