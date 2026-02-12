import { parseEther } from "ethers";
import { defineStore } from "pinia";
import {
  currencyRounded,
  multiplyCurrency,
  floatToWei,
  floatToStrAbs,
} from "src/utils/number-helpers";
import { useOpeningPositionsStore } from "./opening-positions-store";
import { useOffchainTransfersStore } from "./offchain-transfers-store";
import { useChainTxsStore } from "./chain-txs-store";
import { useExchangeTradesStore } from "./exchange-trades-store";
import { formatEther } from "ethers";
import { timestamp } from "@vueuse/core";
import { useRunningBalancesStore } from "./running-balances-store";
import {
  sortByTimeStampThenIdThenSort,
  sortByTimeStampThenSort,
} from "src/utils/array-helpers";

import { getCostBasisTxs } from "./cost-basis/cost-basis-txs.js";
import { getSellTxs } from "./cost-basis/sell-txs.js";
import { getBuyTxs } from "./cost-basis/buy-txs.js";
import { getTransferTxs } from "./cost-basis/transfer-txs.js";
import { processTxs } from "./cost-basis/process-txs";

function getCostBasis() {
  //raw from localStorage
  console.time("getStores-openingPositions");
  const openingPositions = useOpeningPositionsStore().records;
  console.timeEnd("getStores-openingPositions");
  console.time("getStores-offchainTransfers");

  const offchainTransfers = useOffchainTransfersStore().split;
  console.timeEnd("getStores-offchainTransfers");
  console.time("getStores-chainTransactions");

  const chainTransactions = useChainTxsStore().accountTxs;
  console.timeEnd("getStores-chainTransactions");
  console.time("getStores-exchangeTrades");

  const exchangeTrades = useExchangeTradesStore().split;
  //TODO this probably will include rewards for Kraken
  const exchangeFees = useExchangeTradesStore().fees;
  console.timeEnd("getStores-exchangeTrades");

  console.time("Sells");

  let sellTxs = getSellTxs(
    chainTransactions,
    exchangeTrades,
    offchainTransfers,
    exchangeFees
  );
  console.timeEnd("Sells");
  console.time("Buys");
  let buyTxs = getBuyTxs(chainTransactions, exchangeTrades, openingPositions);

  let costBasisTxs = getCostBasisTxs(
    chainTransactions,
    offchainTransfers,
    exchangeFees
  );
  console.timeEnd("Buys");
  console.time("Transfers");

  let transferTxs = getTransferTxs(chainTransactions, offchainTransfers);
  console.timeEnd("Transfers");

  //Merge all txs and sort by timestamp
  //TODO first processTxs up to cutover timestamp
  // Then do virtual transfers
  // then move undispoed lots to wallet cutover account
  // then process remaining txs with wallet cutover accounts
  const runningBalancesStore = useRunningBalancesStore();
  let runningBalances = runningBalancesStore.runningBalances.mappedData.sort(
    sortByTimeStampThenIdThenSort
  );
  let mappedData = [];
  mappedData = mappedData.concat(sellTxs);
  mappedData = mappedData.concat(buyTxs);
  mappedData = mappedData.concat(costBasisTxs);
  //no transfers on first pass
  //mappedData = mappedData.concat(transferTxs);
  mappedData = mappedData.sort(sortByTimeStampThenIdThenSort);

  const {
    undisposedLots,
    soldLots: allSoldLots,
    unreconciledAccounts,
    noInventoryTxs,
  } = processTxs(mappedData, runningBalances);

  const soldLots = allSoldLots.filter((lot) => lot.type != "GIFT-OUT");
  //unreconciledAccounts = verifyBalances(undisposedLots, runningBalances);
  // const ethDiff = unreconciledAccounts.reduce((sum, ua) => {
  //   if (ua.asset == "ETH") {
  //     return sum + ua.calculatedBalance - ua.rbBalance;
  //   }
  //   return sum;
  // }, BigInt("0"));

  return {
    heldLots: undisposedLots,
    soldLots,
    unreconciledAccounts,
    noInventoryTxs,
  };
}

export const useCostBasisStore = defineStore("costBasis", {
  getters: {
    costBasisData() {
      try {
        return getCostBasis();
      } catch (err) {
        console.error(err);
        throw err;
      }
      return [];
    },
  },
});
