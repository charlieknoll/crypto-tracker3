import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { getTransactions } from "src/services/etherscan-provider";
import { usePricesStore } from "./prices-store";

import { getAccountTxs, mergeByHash } from "src/services/chain-tx-mapper";
import { getTokenTxs } from "src/services/token-tx-mapper";
import { sortByTimeStampThenId } from "src/utils/array-helpers";
import { useExchangeTradesStore } from "./exchange-trades-store";
import { getMinedBlocks } from "src/services/mined-block-mapper";
import { useAddressStore } from "./address-store";
import { useQuasar } from "quasar";

export const useChainTxsStore = defineStore("chain-txs", {
  state: () => ({
    rawAccountTxs: useLocalStorage("txs-account", [], {
      shallow: true,
      deep: false,
    }),
    rawInternalTxs: useLocalStorage("txs-internal", [], {
      shallow: true,
      deep: false,
    }),
    rawTokenTxs: useLocalStorage("txs-token", [], {
      shallow: true,
      deep: false,
    }),
    rawMinedBlocks: useLocalStorage("txs-mined", [], {
      shallow: true,
      deep: false,
    }),
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
      const addressStore = useAddressStore();
      addressStore.clearLastBlockSyncs();
      addressStore.clearUnnamed();
    },

    async import() {
      const txs = await getTransactions();

      this.rawAccountTxs = mergeByHash(this.rawAccountTxs, txs.accountTxs);
      this.rawInternalTxs = mergeByHash(this.rawInternalTxs, txs.internalTxs);
      //this.rawTokenTxs = mergeByHash(this.rawTokenTxs, txs.tokenTxs);

      //There is no way to merge token txs as they have no unique identifier except hash which is same for many txs
      let tempTokenTxs = JSON.parse(JSON.stringify(this.rawTokenTxs));
      this.rawTokenTxs = tempTokenTxs.concat(txs.tokenTxs);

      this.rawMinedBlocks = txs.minedBlocks;

      const prices = usePricesStore();
      //await prices.getPrices();
    },
  },
});
