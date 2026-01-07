import { getTaxCode } from "./tax-code-mapper";
import { multiplyCurrency, sBnToFloat } from "src/utils/number-helpers";
import { timestampToDateStr } from "src/utils/date-helper";
import { useAddressStore } from "src/stores/address-store";
import { useMethodStore } from "src/stores/methods-store";
import { usePricesStore } from "src/stores/prices-store";

const mergeMinedBlock = function (target, source) {
  let txs = JSON.parse(JSON.stringify(target));
  //Add source to target and remove dups due to transfers between owned accounts
  return txs
    .concat(source)
    .filter(
      (r, index, self) =>
        index ===
        self.findIndex(
          (tx) =>
            r.blockNumber === tx.blockNumber &&
            r.to == tx.to &&
            r.gasType == tx.gasType
        )
    );
};

const mapMinedBlock = function (tx, addresses, prices) {
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
  const gross = multiplyCurrency([amount, price]);

  let gasFee =
    tx.gasUsed == "0"
      ? 0.0
      : sBnToFloat(BigInt(tx.gasUsed) * BigInt(tx.gasPrice));
  let fee = tx.gasUsed == "0" ? 0.0 : multiplyCurrency([gasFee, price]);
  let id = tx.to + tx.blockNumber + tx.gasType.toLowerCase();

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
    amount,
    taxCode: "INCOME",
    timestamp,
    date,
    price,
    gross,
    fee,
    gasFee,
    txType: tx.txType,
  };
};

const getMinedBlocks = function (rawMinedBlocks) {
  const addresses = useAddressStore();
  const prices = usePricesStore();

  let result = rawMinedBlocks.map((r) => {
    return mapMinedBlock(r, addresses.records, prices);
  });
  return result;
};

export { getMinedBlocks, mergeMinedBlock };
