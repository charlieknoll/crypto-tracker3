import { getTaxCode } from "./tax-code-mapper";
import { multiplyCurrency, sBnToFloat } from "src/utils/number-helpers";
import { timestampToDateStr } from "src/utils/date-helper";
import { BigNumber } from "ethers";
import { useAddressStore } from "src/stores/address-store";
import { useMethodStore } from "src/stores/methods-store";
import { usePricesStore } from "src/stores/prices-store";
import { sortByTimeStampThenId } from "src/utils/array-helpers";

const mergeByHash = function (target, source) {
  let txs = JSON.parse(JSON.stringify(target));
  //Add source to target and remove dups due to transfers between owned accounts
  return txs
    .concat(source)
    .filter(
      (r, index, self) => index === self.findIndex((tx) => r.hash === tx.hash)
    );
};

const mapRawAccountTx = function (tx, addresses, methods, prices, txType) {
  const toAccount = addresses.find((a) => a.address == tx.to);
  const fromAccount = addresses.find((a) => a.address == tx.from);
  const to =
    toAccount && toAccount.name != tx.to
      ? toAccount.name
      : tx.to.substring(0, 8);
  const toAddress = toAccount ? toAccount.address : tx.to;

  const from =
    fromAccount && fromAccount.name != tx.from
      ? fromAccount.name
      : tx.from.substring(0, 8);
  const fromAddress = fromAccount ? fromAccount.address : tx.from;
  const date = timestampToDateStr(tx.timeStamp);
  const timestamp = parseInt(tx.timeStamp);
  const price = prices.getPrice(tx.gasType, date, timestamp);
  const amount = sBnToFloat(tx.value);
  //const bnAmount = BigNumber.from(tx?.value ?? "0");
  const gross = multiplyCurrency([amount, price]);

  let gasFee =
    tx.gasUsed == "0"
      ? 0.0
      : sBnToFloat(
          BigNumber.from(tx.gasUsed).mul(BigNumber.from(tx?.gasPrice ?? "0"))
        );
  let fee = tx.gasUsed == "0" ? 0.0 : multiplyCurrency([gasFee, price]);
  let id = tx.hash.toLowerCase();
  if (tx.seqNo) {
    id += "-" + tx.seqNo;
  }
  // if (
  //   tx?.hash ==
  //   "0x385bb3faccfe08333daec56bf405be08ffe5b0a1217e02cd395df51c579a3679"
  // ) {
  //   debugger;
  // }
  const taxCode = getTaxCode(
    fromAccount?.type,
    toAccount?.type,
    toAccount?.name,
    tx.tokenTxs?.length,
    tx.isError == "1",
    tx
  );
  return {
    id,
    hash: tx.hash,
    asset: tx.gasType,
    gasType: tx.gasType,
    toAccount,
    toAccountName: to,
    toAddress,
    fromAccount,
    fromAccountName: from,
    fromAddress,
    isError: tx.isError == "1",
    amount,
    //bnAmount,
    taxCode,
    method: tx.input.substring(0, 10),
    methodName: methods.getMethodName(tx.input),
    timestamp,
    date,
    price,
    gross,
    fee,
    gasFee,
    txType,
    error: tx.isError,
  };
};

const getAccountTxs = function (rawAccountTxs, rawInternalTxs) {
  const addresses = useAddressStore();
  const methods = useMethodStore();
  const prices = usePricesStore();

  let result = rawAccountTxs.map((r) => {
    return mapRawAccountTx(r, addresses.records, methods, prices, "C");
  });

  result = result.concat(
    rawInternalTxs.map((r) => {
      return mapRawAccountTx(r, addresses.records, methods, prices, "I");
    })
  );

  return result;
};

export { getAccountTxs, mergeByHash };
