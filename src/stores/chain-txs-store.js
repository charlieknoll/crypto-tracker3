import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { getTransactions } from "src/services/etherscan-provider";
import { useAddressStore } from "./address-store";
import { multiplyCurrency, sBnToFloat } from "src/utils/number-helpers";

import { timestampToDateStr } from "src/utils/date-helper";
import { usePricesStore } from "./prices-store";
import { onlyUnique } from "src/utils/array-helpers";
import { useMethodStore } from "./methods-store";
import { getApiPrice } from "src/services/price-provider";
import { BigNumber } from "ethers";

const merge = function (target, source) {
  //TODO handle seqNo?
  let txs = JSON.parse(JSON.stringify(target));
  txs = txs.filter((t) => source.findIndex((rt) => rt.hash == t.hash) == -1);
  const result = txs.concat(source);
  return result;
};

const getTaxCode = function (fromType, toType) {
  if (!fromType) fromType = "";
  if (!toType) toType = "";
  if (fromType.includes("Owned") && toType.includes("Owned")) return "TRANSFER";
  if (fromType == "Income") return "INCOME";
  //TODO clarify this with "GIFT RECEIVED, GIFT GIVEN"
  if (toType == "Gift" || fromType == "Gift") return "GIFT";
  if (toType.includes("Donation")) return "DONATION";
  if (toType == "Spending") return "SPENDING";
  if (toType == "Expense") return "EXPENSE";
  return "";
};

const mapRawAccountTx = function (tx, addresses, methods, prices) {
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
      : sBnToFloat(BigNumber.from(tx.gasUsed).mul(BigNumber.from(tx.gasPrice)));
  let fee = tx.gasUsed == "0" ? 0.0 : multiplyCurrency([gasFee, price]);

  // if (fromAccount?.type.includes("Exchange Owned")) {
  //   fee = 0.0;
  //   gasFee = 0.0;
  // }

  //TODO, this probably needs to be removed if address is deleted this will fail
  // if (!toAccount || !fromAccount)
  //   throw new Error(
  //     "Assertion failed: addresses should have been created on import"
  //   );
  //0x24F7065B079D818B22aA6dDa36F259a026655305
  //0xd6d16B110ea9173d7cEB6CFe8Ca4060749A75f5c
  return {
    id: tx.hash.toLowerCase(),
    asset: tx.gasType,
    toAccount: to,
    toAddress,
    fromAccount: from,
    fromAddress,
    isError: tx.isError == "1",
    amount,
    taxCode: getTaxCode(toAccount?.type, fromAccount?.type),
    method: tx.input.substring(0, 10),
    methodName: methods.getMethodName(tx.input),
    timestamp,
    date,
    price,
    gross,
    fee,
    gasFee,
  };
};

export const useChainTxsStore = defineStore("chain-txs", {
  state: () => ({
    rawAccountTxs: useLocalStorage("txs-account", []),
    rawInternalTxs: useLocalStorage("txs-internal", []),
    rawTokenTxs: useLocalStorage("txs-token", []),
  }),
  getters: {
    accountTxs: (state) => {
      const addresses = useAddressStore();
      const methods = useMethodStore();
      const prices = usePricesStore();

      let result = state.rawAccountTxs.map((r) => {
        return mapRawAccountTx(r, addresses.records, methods, prices);
      });
      result = result.sort((a, b) => {
        return a.timestamp - b.timestamp;
      });
      return result;
    },
  },

  actions: {
    clear() {
      this.rawAccountTxs = [];
    },

    async import() {
      const txs = await getTransactions();
      let result = JSON.parse(JSON.stringify(this.rawAccountTxs));
      result = merge(result, txs.accountTxs)
        .filter(
          (r, index, self) =>
            index === self.findIndex((tx) => r.hash === tx.hash)
        )
        .sort((a, b) => {
          return a.timestamp - b.timestamp;
        });
      this.rawAccountTxs = result;
      const prices = usePricesStore();
      await prices.getPrices();
      // this.internalTxs = merge(this.internalTxs, result.internalTxs);
      // this.tokenTxs = merge(this.tokenTxs, result.tokenTxs);
    },
  },
});
