import { useChainTxsStore } from "src/stores/chain-txs-store";
import { useExchangeTradesStore } from "src/stores/exchange-trades-store";
import { useOffchainTransfersStore } from "src/stores/offchain-transfers-store";
import { useOpeningPositionsStore } from "src/stores/opening-positions-store";
import { usePricesStore } from "src/stores/prices-store";
import { defineStore } from "pinia";
import { parseUnits, parseEther, formatEther, formatUnits } from "ethers/utils";
import { useAddressStore } from "src/stores/address-store";
import { useAppStore } from "src/stores/app-store";
import { computed } from "vue";
import { format } from "quasar";
import {
  sBnToFloat,
  floatToStr,
  floatToWei,
  floatToStrAbs,
} from "src/utils/number-helpers";
const sortByTimeStampThenTxId = (a, b) => {
  return a.timestamp == b.timestamp
    ? a.txId > b.txId
      ? 1
      : -1
    : a.timestamp - b.timestamp;
};
function getMappedData() {
  let mappedData = [];

  const openingPositions = useOpeningPositionsStore().records;
  const offchainTransfers = useOffchainTransfersStore().split;
  const chainTransactions = useChainTxsStore().accountTxs;
  const exchangeTrades = useExchangeTradesStore().split;
  const exchangeFees = useExchangeTradesStore().fees;
  const prices = usePricesStore();
  //opening positions
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
  //offchain transfers these are split into IN/OUT and FEE already
  for (const tx of offchainTransfers) {
    const price = prices.getPrice(tx.asset, tx.date, tx.timestamp);
    const feePrice = prices.getPrice(tx.feeCurrency, tx.date, tx.timestamp);
    if (tx.type == "FEE") {
      mappedData.push({
        txId: "Tr-F-" + tx.id,
        timestamp: tx.timestamp,
        account: tx.fromAccount,
        date: tx.date,
        amount: "-" + tx.amount,
        asset: tx.asset,
        type: "Transfer Fee",
        action: "TF:" + tx.asset,
        price,
      });
    } else {
      if (tx.type == "TRANSFER") {
        mappedData.push({
          txId: "Tr-2-" + tx.id,
          timestamp: tx.timestamp,
          account: tx.toAccount,
          date: tx.date,
          amount: tx.amount,
          asset: tx.asset,
          type: "Transfer In",
          action: tx.type,
          price,
        });
      }
      mappedData.push({
        txId: "Tr-1-" + tx.id,
        timestamp: tx.timestamp,
        account: tx.fromAccount,
        date: tx.date,
        amount: "-" + tx.amount,
        asset: tx.asset,
        type: "Transfer Out",
        action: tx.type,
        price,
      });
    }
  }
  //chain transactions not token
  for (const tx of chainTransactions.filter((tx) =>
    ["C", "I", "B", "U"].includes(tx.txType)
  )) {
    if (tx?.fromAccountName.toLowerCase() == "genesis") continue;
    //if (tx.fromAccount.type == "Gift") continue;

    try {
      if (tx.toAccount?.type?.toLowerCase().includes("owned")) {
        mappedData.push({
          txId: "Ch-I-" + tx.id,
          blockNumber: tx.blockNumber,
          timestamp: tx.timestamp,
          account: tx.toAccount.name,
          date: tx.date,
          amount: formatEther(
            tx.isError ? BigInt("0") : BigInt(tx.value ?? "0 ")
          ),
          asset: tx.asset,
          price: tx.price,
          type: "Chain-in",
          hash: tx.hash,
          action: tx.taxCode,
        });
      }
      if (
        tx.fromAccount?.type?.toLowerCase().includes("owned") ||
        tx.fromAccount?.type?.toLowerCase().includes("gift")
      ) {
        let gasFee = tx.gasFee;
        if (tx.fromAccount?.type?.toLowerCase() != "owned") {
          gasFee = "0";
        }
        mappedData.push({
          txId: "Ch-O-" + tx.id,
          blockNumber: tx.blockNumber,
          timestamp: tx.timestamp,
          account: tx.fromAccount.name,
          date: tx.date,
          amount: formatEther(
            tx.isError ? -BigInt(gasFee) : -BigInt(tx.value) - BigInt(gasFee)
          ),
          asset: tx.asset,
          price: tx.price,
          type: "Chain-out",
          hash: tx.hash,
          action: tx.taxCode,
        });
      }
    } catch (err) {
      console.error(err);
      debugger;
    }
  }
  //chain transactions token
  for (const tx of chainTransactions.filter((tx) => tx.txType == "T")) {
    if (tx.asset == "ETH") continue;
    if (tx?.fromAccountName.toLowerCase() == "genesis") continue;
    //if (tx.fromAccount.type == "Gift") continue;
    try {
      if (tx.toAccount?.type?.toLowerCase().includes("owned")) {
        mappedData.push({
          txId: "To-I-" + tx.id,
          timestamp: tx.timestamp,
          blockNumber: tx.blockNumber,

          account: tx.toAccount.name,
          date: tx.date,
          amount: formatEther(
            tx.isError ? BigInt("0") : BigInt(tx.value ?? "0 ")
          ),
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
          blockNumber: tx.blockNumber,
          account: tx.fromAccount.name,
          date: tx.date,
          amount: formatEther(tx.isError ? BigInt("0") : -BigInt(tx.value)),
          asset: tx.asset,
          price: tx.price,
          type: "Token-out",
          action: tx.taxCode,
          hash: tx.hash,
        });
      }
    } catch (err) {
      //debugger;
      console.error(err);
    }
  }
  //exchange trades, these are split into BUY/SELL and FEE already
  for (const tx of exchangeTrades) {
    //SELL and FEE should be negative
    let amount =
      tx.action == "BUY" ? floatToStr(tx.amount) : "-" + floatToStr(tx.amount);

    //amount = amount.toFixed(18);
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
  //TODO convert to exchangeRewardFees to handle new Kraken rewards
  //Exchange Fees get imported from Coinbase, no UI, just saved in localStorage

  for (const tx of exchangeFees) {
    mappedData.push({
      txId: "Ef-" + tx.id.substring(0, 13),
      timestamp: Math.floor(tx.timestamp),
      account: tx.account,
      date: tx.date,
      amount: "-" + floatToStrAbs(tx.amount),
      asset: tx.asset,
      price: tx.price,
      type: tx.action,
      action: tx.action,
    });
  }

  return mappedData;
}
function getRunningBalances() {
  //TODO testing

  let mappedData = getMappedData();
  mappedData = mappedData.sort(sortByTimeStampThenTxId);
  //Sort by timestamp
  //TODO set running balances
  const accountAssets = [];
  let assets = [];
  for (const tx of mappedData) {
    tx.biAmount = tx.value ?? floatToWei(tx.amount) ?? BigInt("0.0");
    tx.amount = parseFloat(tx.amount);
    let asset = assets.find((a) => a.symbol == tx.asset);
    if (!asset) {
      asset = {
        endingTxs: {},
        symbol: tx.asset,
        amount: 0.0,
        biAmount: parseUnits("0", 18),
      };
      assets.push(asset);
    }
    asset.amount += tx.amount;
    asset.biAmount = tx.biAmount + asset.biAmount;
    tx.runningBalance = parseFloat(asset.amount);
    tx.biRunningBalance = asset.biAmount;
    // console.log(
    //   `Tx ${tx.txId} ${tx.asset} Amount: ${
    //     tx.amount
    //   } Running Bal: ${formatEther(tx.biRunningBalance)}`
    // );
    //console.log(formatEther(tx.biRunningBalance));
    asset.endingTxs[tx.date.substring(0, 4)] = tx;

    let accountAsset = accountAssets.find(
      (a) => a.symbol == tx.asset && a.account == tx.account
    );
    if (!accountAsset) {
      accountAsset = {
        endingTxs: {},
        symbol: tx.asset,
        amount: 0.0,
        biAmount: BigInt("0"),
        account: tx.account,
      };
      accountAssets.push(accountAsset);
    }
    accountAsset.endingTxs[tx.date.substring(0, 4)] = tx;

    accountAsset.amount += tx.amount;
    accountAsset.biAmount = tx.biAmount + accountAsset.biAmount;
    tx.accountEndingYears = [];
    tx.assetEndingYears = [];
    tx.runningAccountBalance = accountAsset.amount;
    tx.biRunningAccountBalance = accountAsset.biAmount;
    tx.year = parseInt(tx.date.substring(0, 4));
  }
  const app = useAppStore();
  const addresses = useAddressStore().records;
  for (const aa of accountAssets) {
    let endingTx = null;
    for (const taxYear of app.taxYears) {
      const _taxYear = taxYear.toString();
      if (_taxYear == "All") {
        //set status to not-matched if biRunningAccountBalance does not equal address current balance
        const address = addresses.find(
          (a) => a.name == aa.account && a.chain == aa.symbol
        );
        if (!address) continue;
        //const addrBalance = parseEther(address.balance ?? "0.0");
        if (
          aa.biAmount != BigInt(address.balance ?? "0") &&
          address.type == "Owned"
        ) {
          aa.endingTxs[aa.lastYear].status = "red";
          const calculatedBalance = formatEther(aa.biAmount);
          const addressBalance = formatEther(BigInt(address.balance ?? "0"));
          const delta = formatEther(
            aa.biAmount - BigInt(address.balance ?? "0")
          );
          aa.endingTxs[
            aa.lastYear
          ].delta = `Calculated balance ${calculatedBalance} does not match address balance ${addressBalance}. Delta: ${delta}`;
        } else {
          if (address.balance) aa.endingTxs[aa.lastYear].status = "green";
        }
        continue;
      }
      aa.lastYear = taxYear;
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
  return { mappedData, assets, accountAssets };
}
export const useRunningBalancesStore = defineStore("runningBalances", {
  getters: {
    runningBalances: () => {
      const runningBalances = getRunningBalances();
      return runningBalances;
    },
    mappedData: () => {
      try {
        return getMappedData();
      } catch (err) {
        console.error(err);
        debugger;
      }
      return [];
    },
  },
});
