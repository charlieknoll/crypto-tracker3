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
    rawAccountTxs: useLocalStorage("txs-account", [], {
      shallow: true,
      deep: false,
    }),
    rawInternalTxs: useLocalStorage("txs-internal", []),
    rawTokenTxs: useLocalStorage("txs-token", []),
    rawMinedBlocks: useLocalStorage("txs-mined", []),
  }),
  getters: {
    accountTxs: (state) => {
      const exchangeTrades = useExchangeTradesStore();
      //TODO make tokenTxs children of  either acct or internal tx and do it all in one pass
      let result = JSON.parse(JSON.stringify(state.rawAccountTxs));
      const tokenTxs = JSON.parse(JSON.stringify(state.rawTokenTxs));
      for (let i = 0; i < result.length; i++) {
        const tx = result[i];
        tx.tokenTxs = tokenTxs.filter((t) => t.hash == tx.hash);
      }
      result = getAccountTxs(result, state.rawInternalTxs);
      const testTokenTxs = getTokenTxs(
        result,
        state.rawTokenTxs,
        exchangeTrades.fees
      );

      result = result.concat(testTokenTxs);

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

      let tempTokenTxs = JSON.parse(JSON.stringify(this.rawTokenTxs));
      this.rawTokenTxs = tempTokenTxs.concat(txs.tokenTxs);
      //No more mined blocks for now
      //this.rawMinedBlocks = txs.minedBlocks;

      const prices = usePricesStore();
      await prices.getPrices();
    },
  },
});
