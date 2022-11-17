import { getChainTransactions } from "./chain-tx-provider";
import { getTokenTransactions } from "./token-tx-provider";
import { getExchangeTrades } from "./exchange-tx-provider";
import { actions } from "../boot/actions";
//import { store } from "../boot/store";

export const getRunningBalances = async function (store) {
  if (!store.updated) return store.runningBalances;
  let mappedData = [];
  const openingPositions = (await actions.getData("openingPositions")) ?? [];
  const offchainTransfers = (await actions.getData("offchainTransfers")) ?? [];
  const chainTransactions = await getChainTransactions();
  const tokenTransactions = await getTokenTransactions();
  const exchangeTrades = await getExchangeTrades();
  const exchangeTransferFees =
    (await actions.getData("exchangeTransferFees")) ?? [];

  for (const tx of openingPositions) {
    let account = tx.account;
    if (account.includes("->")) {
      account = account.split("->")[1];
    }
    mappedData.push({
      txId: "opening-" + tx.txId,
      timestamp: tx.timestamp,
      account,
      date: tx.date,
      amount: tx.amount,
      asset: tx.asset,
      price: tx.price,
      type: "Open",
    });
  }
  for (const tx of offchainTransfers) {
    mappedData.push({
      txId: "Tr-I-" + tx.txId,
      timestamp: tx.timestamp,
      account: tx.toName,
      date: tx.date,
      amount: tx.amount,
      asset: tx.asset,
      type: "Transfer In",
    });
    mappedData.push({
      txId: "Tr-O-" + tx.txId,
      timestamp: tx.timestamp,
      account: tx.fromName,
      date: tx.date,
      amount:
        tx.asset == tx.transferFeeCurrency
          ? -tx.amount - tx.transferFee
          : -tx.amount,
      asset: tx.asset,
      type: "Transfer Out",
    });
  }
  for (const tx of chainTransactions) {
    if (tx.fromName == "GENESIS") continue;
    if (tx.fromAccount.type == "Gift") continue;

    if (tx.toAccount.type.toLowerCase().includes("owned")) {
      mappedData.push({
        txId: "Ch-I-" + tx.txId,
        timestamp: tx.timestamp,
        account: tx.toAccount.name,
        date: tx.date,
        amount: tx.isError ? 0.0 : tx.amount,
        asset: tx.gasType,
        price: tx.price,
        type: "Chain-in",
        hash: tx.hash,
      });
    }
    if (tx.fromAccount.type.toLowerCase().includes("owned")) {
      mappedData.push({
        txId: "Ch-O-" + tx.txId,
        timestamp: tx.timestamp,
        account: tx.fromAccount.name,
        date: tx.date,
        amount: tx.isError ? -tx.gasFee : -tx.amount - tx.gasFee,
        asset: tx.gasType,
        price: tx.price,
        type: "Chain-out",
        hash: tx.hash,
      });
    }
  }
  const _tokenTransactions = tokenTransactions.filter((tt) => tt.tracked);
  for (const tx of _tokenTransactions) {
    if (tx.isError) continue;
    const internalTransfer =
      tx.toAccount.type.toLowerCase().includes("owned") &&
      tx.fromAccount.type.toLowerCase().includes("owned");

    if (tx.toAccount.type.toLowerCase().includes("owned")) {
      mappedData.push({
        txId: "Tk-I-" + tx.txId,
        internalTransfer,
        timestamp: tx.timestamp,
        account: tx.toAccount.name,
        date: tx.date,
        amount: tx.decimalAmount,
        asset: tx.asset,
        price: tx.price,
        type: "Token-in",
        hash: tx.hash,
        action: tx.methodName,
      });
    }
    if (tx.fromAccount.type.toLowerCase().includes("owned")) {
      mappedData.push({
        txId: "Tk-O-" + tx.txId,
        internalTransfer,
        timestamp: tx.timestamp - 1,
        account: tx.fromAccount.name,
        date: tx.date,
        amount: -tx.decimalAmount,
        asset: tx.asset,
        price: tx.price,
        type: "Token-out",
        hash: tx.hash,
        action: tx.methodName,
      });
    }
  }
  for (const tx of exchangeTrades) {
    let amount = tx.action == "SELL" ? -tx.amount : tx.amount;
    mappedData.push({
      txId: "Ex-" + tx.txId.substring(0, 13),
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
  for (const tx of exchangeTransferFees) {
    mappedData.push({
      txId: "Exf-" + tx.txId.substring(0, 13),
      timestamp: tx.timestamp,
      account: tx.account,
      date: tx.date,
      amount: -tx.amount,
      asset: tx.asset,
      price: tx.price,
      type: tx.action,
      action: tx.action,
    });
  }
  mappedData = mappedData.sort((a, b) => a.timestamp - b.timestamp);
  //Sort by timestamp
  //TODO set running balances
  const accountAssets = [];
  let assets = [];
  for (const tx of mappedData) {
    let asset = assets.find((a) => a.symbol == tx.asset);
    if (!asset) {
      asset = {
        endingTxs: {},
        symbol: tx.asset,
        amount: 0.0,
      };
      assets.push(asset);
    }
    asset.amount += tx.internalTransfer ? 0.0 : tx.amount;
    tx.runningBalance = asset.amount;
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
  for (const aa of accountAssets) {
    let endingTx = null;
    for (const taxYear of store.taxYears) {
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
    for (const taxYear of store.taxYears) {
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
  const accountNames = [...new Set(accountAssets.map((aa) => aa.account))];
  assets = [...new Set(assets.map((aa) => aa.symbol))];
  assets.sort();
  accountNames.sort();
  store.assets = assets;
  store.accounts = accountNames;
  store.runningBalances = mappedData;
  store.updated = false;
  return mappedData;
};

export const columns = [
  {
    name: "date",
    label: "Date",
    field: "date",
    align: "left",
  },
  {
    name: "timestamp",
    label: "Timestamp",
    field: "timestamp",
    align: "left",
  },
  {
    name: "txId",
    label: "Id",
    field: "txId",
    align: "left",
  },
  {
    name: "account",
    label: "Account",
    field: "account",
    align: "left",
  },
  {
    name: "asset",
    label: "Asset",
    field: "asset",
    align: "left",
  },
  {
    name: "type",
    label: "Type",
    field: "type",
    align: "left",
  },
  {
    name: "action",
    label: "Action",
    field: "action",
    align: "left",
  },
  {
    name: "amount",
    label: "Amount",
    field: "amount",
    align: "right",
    format: (val, row) => `${(val ?? 0.0).toFixed(4)}`,
  },
  {
    name: "price",
    label: "Price",
    field: "price",
    align: "right",
    format: (val, row) => `$${val ? parseFloat(val).toFixed(2) : "0.00"}`,
  },
  {
    name: "runningAccountBalance",
    label: "Running Acct Balance",
    field: "runningAccountBalance",
    align: "right",
    format: (val, row) => `${(val ?? 0.0).toFixed(12)}`,
  },
  {
    name: "runningBalance",
    label: "Running Balance",
    field: "runningBalance",
    align: "right",
    format: (val, row) => `${(val ?? 0.0).toFixed(12)}`,
  },
];
