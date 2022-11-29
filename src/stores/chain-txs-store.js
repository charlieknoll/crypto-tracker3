import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { getTransactions } from "src/services/etherscan-provider";
import { useAddressStore } from "./address-store";
import { sBnToFloat } from "src/utils/number-helpers";
import getMethodName from "src/services/methods";

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
  return "UNKNOWN";
};

const mapRawAccountTx = function (tx, addresses) {
  const toAccount = addresses.find((a) => a.address == tx.to);
  const fromAccount = addresses.find((a) => a.address == tx.from);
  //TODO, this probably needs to be removed if address is deleted this will fail
  // if (!toAccount || !fromAccount)
  //   throw new Error(
  //     "Assertion failed: addresses should have been created on import"
  //   );
  return {
    id: tx.hash.toLowerCase(),
    asset: tx.gasType,
    to: toAccount?.name ?? tx.to.substring(0, 8),
    from: fromAccount?.name ?? tx.from.substring(0, 8),
    isError: tx.isError == "1",
    amount: sBnToFloat(tx.value),
    taxCode: getTaxCode(toAccount?.type, fromAccount?.type),
    method: getMethodName(tx.input),
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

      const result = state.rawAccountTxs.map((r) => {
        return mapRawAccountTx(r, addresses.records);
      });

      return result;
    },
  },

  actions: {
    clear() {
      this.rawAccountTxs = [];
    },

    async import() {
      const result = await getTransactions();
      this.rawAccountTxs = merge(this.rawAccountTxs, result.accountTxs);
      // this.internalTxs = merge(this.internalTxs, result.internalTxs);
      // this.tokenTxs = merge(this.tokenTxs, result.tokenTxs);
    },
  },
});
