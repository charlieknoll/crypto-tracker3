import { defineStore } from "pinia";
import { useOpeningPositionsStore } from "./opening-positions-store";
import { useOffchainTransfersStore } from "./offchain-transfers-store";
import { useChainTxsStore } from "./chain-txs-store";
import { useExchangeTradesStore } from "./exchange-trades-store";
import { useRunningBalancesStore } from "./running-balances-store";
import { useAppStore } from "./app-store";
import {
  sortByTimeStampThenIdThenSort,
  sortByTimeStampThenSort,
} from "src/utils/array-helpers";

import { getCostBasisTxs } from "./cost-basis/cost-basis-txs.js";
import { getSellTxs } from "./cost-basis/sell-txs.js";
import { getBuyTxs } from "./cost-basis/buy-txs.js";
import { getTransferTxs } from "./cost-basis/transfer-txs.js";
import { processTxs } from "./cost-basis/process-txs";
import constants from "src/constants";
import { redistributeLotsToAccounts } from "./cost-basis/lot-redistribution.js";
import {
  verifyAssetBalance,
  verifyBalances,
} from "./cost-basis/verification.js";

function getTransactions() {
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
  console.timeEnd("Buys");

  console.time("CostBasisTxs");
  let costBasisTxs = getCostBasisTxs(
    chainTransactions,
    offchainTransfers,
    exchangeFees
  );
  console.timeEnd("CostBasisTxs");

  console.time("Transfers");
  let transferTxs = getTransferTxs(chainTransactions, offchainTransfers);
  console.timeEnd("Transfers");
  return {
    sellTxs,
    buyTxs,
    costBasisTxs,
    transferTxs,
  };
}
function filterAndConcatTxs(txArrays, cutoff, comparator) {
  return txArrays
    .flatMap((txs) => txs.filter((tx) => comparator(tx.timestamp, cutoff)))
    .sort(sortByTimeStampThenIdThenSort);
}

function getCostBasis(transactions) {
  // Deep clone to prevent mutation of cached getter values
  const { sellTxs, buyTxs, costBasisTxs, transferTxs } =
    structuredClone(transactions);
  const appStore = useAppStore();
  const taxYear =
    (appStore.taxYear == "All"
      ? Number(appStore.taxYears[appStore.taxYears.length - 2]) + 1
      : Number(appStore.taxYear) + 1) + "-01-01"; // Approximate cutoff for tax year
  const taxYearCutoff = new Date(taxYear).getTime() / 1000;
  const runningBalancesStore = useRunningBalancesStore();
  let runningBalances = [
    ...runningBalancesStore.runningBalances.mappedData,
  ].sort(sortByTimeStampThenIdThenSort);
  //no transfers on first pass
  let mappedData = filterAndConcatTxs(
    [sellTxs, buyTxs, costBasisTxs],
    constants.WALLET_TIMESTAMP_CUTOFF,
    (ts, cutoff) => ts < cutoff && ts < taxYearCutoff
  );

  let { undisposedLots, soldLots, unreconciledAccounts, noInventoryTxs } =
    processTxs(mappedData, runningBalances, constants.WALLET_TIMESTAMP_CUTOFF);
  //mappedData = [];
  const delta = verifyAssetBalance(
    constants.WALLET_TIMESTAMP_CUTOFF,
    "ETH",
    runningBalances,
    undisposedLots
  );
  let newLots = [];
  if (taxYearCutoff > constants.WALLET_TIMESTAMP_CUTOFF) {
    newLots = redistributeLotsToAccounts(
      undisposedLots,
      runningBalances,
      constants.WALLET_TIMESTAMP_CUTOFF
    );
  }
  undisposedLots = undisposedLots.filter(
    (lot) => lot.remainingAmount > BigInt("0")
  );
  undisposedLots = undisposedLots.concat(newLots).sort(sortByTimeStampThenSort);
  unreconciledAccounts = verifyBalances(
    undisposedLots,
    runningBalances,
    constants.WALLET_TIMESTAMP_CUTOFF + 1
  );

  mappedData = filterAndConcatTxs(
    [sellTxs, buyTxs, costBasisTxs, transferTxs],
    constants.WALLET_TIMESTAMP_CUTOFF,
    (ts, cutoff) => ts >= cutoff && ts < taxYearCutoff
  );

  ({ undisposedLots, soldLots, unreconciledAccounts, noInventoryTxs } =
    processTxs(
      mappedData,
      runningBalances,
      constants.WALLET_TIMESTAMP_CUTOFF,
      undisposedLots,
      soldLots
    ));
  const giftLots = soldLots.filter((lot) => lot.taxTxType === "GIFT-OUT");
  soldLots = soldLots.filter((lot) => lot.type != "GIFT-OUT");
  return {
    heldLots: undisposedLots,
    soldLots,
    unreconciledAccounts,
    noInventoryTxs,
    giftLots,
  };
}

export const useCostBasisStore = defineStore("costBasis", {
  getters: {
    transactions() {
      return getTransactions();
    },

    costBasisData() {
      try {
        return getCostBasis(this.transactions);
      } catch (err) {
        console.error(err);
        throw err;
      }
      return [];
    },
  },
});
