import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { getTransactions } from "src/services/etherscan-provider";

export const useChainTxsStore = defineStore("chain-txs", {
  state: () => ({
    accountTxs: useLocalStorage("txs-account", []),
    internalTxs: useLocalStorage("txs-internal", []),
    tokenTxs: useLocalStorage("txs-token", []),
  }),

  actions: {
    clear() {
      //TODO
    },
    async import() {
      const result = await getTransactions();
    },
  },
});
