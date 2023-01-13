import { useChainTxsStore } from "src/stores/chain-txs-store";
import { useExchangeTradesStore } from "src/stores/exchange-trades-store";
import { useOffchainTransfersStore } from "src/stores/offchain-transfers-store";
import { useOpeningPositionsStore } from "src/stores/opening-positions-store";
import { usePricesStore } from "src/stores/prices-store";
import { defineStore } from "pinia";

import { useAppStore } from "src/stores/app-store";
import { computed } from "vue";
const sortByTimeStampThenTxId = (a, b) => {
  return a.timestamp == b.timestamp
    ? a.txId > b.txId
      ? 1
      : -1
    : a.timestamp - b.timestamp;
};

function getRunningBalances() {
  let mappedData = [];

  const openingPositions = useOpeningPositionsStore().records;
  const offchainTransfers = useOffchainTransfersStore().split;
  const chainTransactions = useChainTxsStore().accountTxs;
  const exchangeTrades = useExchangeTradesStore().split;
  for (const tx of openingPositions) {
    let account = tx.account;
    if (account.includes("->")) {
      account = account.split("->")[1];
    }

    mappedData.push({
      txId: "Op-" + tx.id,
      timestamp: tx.timestamp,
      account,
      date: tx.date,
      amount: tx.amount,
      asset: tx.asset,
      price: tx.price,
      type: "Open",
      action: "BUY",
    });
  }
  const prices = usePricesStore();

  for (const tx of offchainTransfers) {
    const price = prices.getPrice(tx.asset, tx.date, tx.timestamp);
    const feePrice = prices.getPrice(tx.feeCurrency, tx.date, tx.timestamp);
    if (tx.type == "FEE") {
      mappedData.push({
        txId: "Tr-F-" + tx.id,
        timestamp: tx.timestamp,
        account: tx.fromAccount,
        date: tx.date,
        amount: -tx.amount,
        asset: tx.asset,
        type: "Transfer Fee",
        action: "TF:" + tx.asset,
        price,
      });
    } else {
      mappedData.push({
        txId: "Tr-2-" + tx.id,
        timestamp: tx.timestamp,
        account: tx.toAccount,
        date: tx.date,
        amount: tx.amount,
        asset: tx.asset,
        type: "Transfer In",
        action: "TRANSFER",
        price,
      });
      mappedData.push({
        txId: "Tr-1-" + tx.id,
        timestamp: tx.timestamp,
        account: tx.fromAccount,
        date: tx.date,
        amount: -tx.amount,
        asset: tx.asset,
        type: "Transfer Out",
        action: "TRANSFER",
        price,
      });
    }
  }
  let i = 0;

  for (const tx of chainTransactions.filter((tx) =>
    ["C", "I", "B", "U"].includes(tx.txType)
  )) {
    if (tx?.fromAccountName.toLowerCase() == "genesis") continue;
    //if (tx.fromAccount.type == "Gift") continue;
    try {
      if (tx.toAccount?.type?.toLowerCase().includes("owned")) {
        mappedData.push({
          txId: "Ch-I-" + tx.id,
          timestamp: tx.timestamp,
          account: tx.toAccount.name,
          date: tx.date,
          amount: tx.isError ? 0.0 : tx.amount,
          asset: tx.asset,
          price: tx.price,
          type: "Chain-in",
          hash: tx.hash,
          action: tx.taxCode,
        });
      }
      if (tx.fromAccount?.type?.toLowerCase().includes("owned")) {
        let gasFee = tx.gasFee;
        if (tx.fromAccount?.type?.toLowerCase() != "owned") {
          gasFee = 0.0;
        }
        mappedData.push({
          txId: "Ch-O-" + tx.id,
          timestamp: tx.timestamp,
          account: tx.fromAccount.name,
          date: tx.date,
          amount: tx.isError ? -gasFee : -tx.amount - gasFee,
          asset: tx.asset,
          price: tx.price,
          type: "Chain-out",
          hash: tx.hash,
          action: tx.taxCode,
        });
      }
      i++;
    } catch (err) {
      debugger;
    }
  }

  for (const tx of chainTransactions.filter((tx) => tx.txType == "T")) {
    if (tx?.fromAccountName.toLowerCase() == "genesis") continue;
    //if (tx.fromAccount.type == "Gift") continue;
    try {
      if (tx.toAccount?.type?.toLowerCase().includes("owned")) {
        mappedData.push({
          txId: "To-I-" + tx.id,
          timestamp: tx.timestamp,
          account: tx.toAccount.name,
          date: tx.date,
          amount: tx.amount,
          asset: tx.asset,
          price: tx.price,
          type: "Token-in",
          action: tx.taxCode,
          hash: tx.hash,
        });
      }
      if (tx.fromAccount?.type?.toLowerCase().includes("owned")) {
        mappedData.push({
          txId: "Ch-O-" + tx.id,
          timestamp: tx.timestamp,
          account: tx.fromAccount.name,
          date: tx.date,
          amount: -tx.amount,
          asset: tx.asset,
          price: tx.price,
          type: "Token-out",
          action: tx.taxCode,
          hash: tx.hash,
        });
      }
      i++;
    } catch (err) {
      debugger;
    }
  }

  for (const tx of exchangeTrades) {
    //SELL and FEE should be negative
    let amount = tx.action == "BUY" ? tx.amount : -tx.amount;
    mappedData.push({
      txId: "Ex-" + tx.id.substring(0, 13),
      timestamp: tx.timestamp,
      account: tx.account,
      date: tx.date,
      amount,
      asset: tx.asset,
      price: tx.price,
      type: tx.action,
      action: tx.action,
    });
  }
  mappedData = mappedData.sort(sortByTimeStampThenTxId);
  //Sort by timestamp
  //TODO set running balances
  const accountAssets = [];
  let assets = [];
  for (const tx of mappedData) {
    tx.amount = parseFloat(tx.amount);
    let asset = assets.find((a) => a.symbol == tx.asset);
    if (!asset) {
      asset = {
        endingTxs: {},
        symbol: tx.asset,
        amount: 0.0,
      };
      assets.push(asset);
    }
    asset.amount += tx.amount;
    tx.runningBalance = parseFloat(asset.amount);
    asset.endingTxs[tx.date.substring(0, 4)] = tx;

    let accountAsset = accountAssets.find(
      (a) => a.symbol == tx.asset && a.account == tx.account
    );
    if (!accountAsset) {
      accountAsset = {
        endingTxs: {},
        symbol: tx.asset,
        amount: 0.0,
        account: tx.account,
      };
      accountAssets.push(accountAsset);
    }
    accountAsset.endingTxs[tx.date.substring(0, 4)] = tx;
    accountAsset.amount += tx.amount;
    tx.accountEndingYears = [];
    tx.assetEndingYears = [];
    tx.runningAccountBalance = accountAsset.amount;
    tx.year = parseInt(tx.date.substring(0, 4));
  }
  const app = useAppStore();

  for (const aa of accountAssets) {
    let endingTx = null;
    for (const taxYear of app.taxYears) {
      const _taxYear = taxYear.toString();
      if (_taxYear == "All") continue;
      if (aa.endingTxs[_taxYear]) {
        aa.endingTxs[_taxYear].accountEndingYears.push(taxYear);
        endingTx = aa.endingTxs[_taxYear];
        continue;
      }
      if (endingTx == null) continue;
      const prevYear = (taxYear - 1).toString();
      aa.endingTxs[_taxYear] = aa.endingTxs[prevYear];
      aa.endingTxs[_taxYear].accountEndingYears.push(taxYear);
    }
  }
  for (const aa of assets) {
    let endingTx = null;
    for (const taxYear of app.taxYears) {
      const _taxYear = taxYear.toString();
      if (_taxYear == "All") continue;
      if (aa.endingTxs[_taxYear]) {
        aa.endingTxs[_taxYear].assetEndingYears.push(taxYear);
        endingTx = aa.endingTxs[_taxYear];
        continue;
      }
      if (endingTx == null) continue;
      const prevYear = (taxYear - 1).toString();
      aa.endingTxs[_taxYear] = aa.endingTxs[prevYear];
      aa.endingTxs[_taxYear].assetEndingYears.push(taxYear);
    }
  }

  //build unique list of assets,accounts
  // const accountNames = [...new Set(accountAssets.map((aa) => aa.account))];
  // assets = [...new Set(assets.map((aa) => aa.symbol))];
  // assets.sort();
  // accountNames.sort();
  // store.assets = assets;
  // store.accounts = accountNames;
  // store.runningBalances = mappedData;
  // store.updated = false;
  return mappedData;
}
export const useRunningBalancesStore = defineStore("runningBalances", {
  getters: {
    runningBalances: () => getRunningBalances(),
  },
});
