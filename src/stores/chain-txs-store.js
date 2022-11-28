import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { getTransactions } from "src/services/etherscan-provider";

const merge = function (target, source) {
  //TODO handle seqNo?
  let txs = JSON.parse(JSON.stringify(target));
  txs = txs.filter((t) => source.findIndex((rt) => rt.hash == t.hash) == -1);
  const result = txs.concat(source);
  return result;
};

const getTaxCode = function (fromType, toType) {
  if (fromType.includes("Owned") && toType.includes("Owned")) return "TRANSFER";
  if (fromType == "Income") return "INCOME";
  //TODO clarify this with "GIFT RECEIVED, GIFT GIVEN"
  if (toType == "Gift" || fromType == "Gift") return "GIFT";
  if (toType.includes("Donation")) return "DONATION";
  if (toType == "Spending") return "SPENDING";
  if (toType == "Expense") return "EXPENSE";
  return "UNKNOWN";
};

const mapRawAccountTx = function (r) {
  return {
    id: r.hash,
    date: r.date,
  };
};

export const useChainTxsStore = defineStore("chain-txs", {
  state: () => ({
    rawAccountTxs: useLocalStorage("txs-account", []),
    rawInternalTxs: useLocalStorage("txs-internal", []),
    rawTokenTxs: useLocalStorage("txs-token", []),
  }),
  getters: {
    accountTxs: (state) => state.rawAccountTxs.map(mapRawAccountTx),
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
