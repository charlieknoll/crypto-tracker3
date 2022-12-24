import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { getTransactions } from "src/services/etherscan-provider";
import { usePricesStore } from "./prices-store";

import { getAccountTxs, mergeByHash } from "src/services/chain-tx-mapper";
import { getTokenTxs } from "src/services/token-tx-mapper";
import { sortByTimeStampThenId } from "src/utils/array-helpers";
import { useExchangeTradesStore } from "./exchange-trades-store";
import { getMinedBlocks } from "src/services/mined-block-mapper";

export const useChainTxsStore = defineStore("chain-txs", {
  state: () => ({
    rawAccountTxs: useLocalStorage("txs-account", []),
    rawInternalTxs: useLocalStorage("txs-internal", []),
    rawTokenTxs: useLocalStorage("txs-token", []),
    rawMinedBlocks: useLocalStorage("txs-mined", []),
  }),
  getters: {
    accountTxs: (state) => {
      const exchangeTrades = useExchangeTradesStore();
      let result = getAccountTxs(state.rawAccountTxs, state.rawInternalTxs);
      result = result.concat(
        getTokenTxs(result, state.rawTokenTxs, exchangeTrades.fees)
      );
      result = result.concat(getMinedBlocks(state.rawMinedBlocks));
      result = result.sort(sortByTimeStampThenId);
      return result;
    },
  },

  actions: {
    clear() {
      this.rawAccountTxs = [];
      this.rawInternalTxs = [];
      this.rawTokenTxs = [];
      this.rawMinedBlocks = [];
    },

    async import() {
      const txs = await getTransactions();
      this.rawAccountTxs = mergeByHash(this.rawAccountTxs, txs.accountTxs);
      this.rawInternalTxs = mergeByHash(this.rawInternalTxs, txs.internalTxs);
      this.rawTokenTxs = txs.tokenTxs;
      this.rawMinedBlocks = txs.minedBlocks;

      const prices = usePricesStore();
      await prices.getPrices();
    },
  },
});
