import axios from "axios";
import { useAddressStore } from "src/stores/address-store";
import { useAppStore } from "src/stores/app-store";
import { useSettingsStore } from "src/stores/settings-store";
import { sleep, throttle } from "../utils/cacheUtils";
let lastRequestTime = 0;
let debug = 1;

import { getScanProviders } from "./scan-providers";
//https://api.etherscan.io/v2/chainlist

async function getTokenTransactions(oa, provider) {
  const tokenTxApiUrl =
    `${provider.baseUrl}?chainId=${provider.chainId}&module=account&action=tokentx&address=` +
    `${oa.address}&startblock=${oa.lastBlockSync + 1}&endblock=${
      provider.currentBlock
    }&sort=asc&apikey=${provider.apikey}`;
  const result = await axios.get(tokenTxApiUrl);
  if (
    result.data.status != "1" &&
    result.data.message != "No transactions found"
  ) {
    if (debug) console.log("tokenTxApiUrl: ", tokenTxApiUrl);
    throw new Error(
      "Invalid return status: " + result.data.message + ":" + result.data.result
    );
  }
  const txs = result.data.result;
  for (const tx of txs) {
    if (tx.timeStamp) {
      tx.timestamp = parseInt(tx.timeStamp);
      tx.to = tx.to.toLowerCase();
      tx.from = tx.from.toLowerCase();
    }
    tx.gasType = provider.gasType;
    //TODO addImportedAccount
    const addresses = useAddressStore();
    addresses.set({ address: tx.to, chain: provider.gasType });
    addresses.set({ address: tx.from, chain: provider.gasType });
  }
  return txs;
}
export const getAccountBalance = async function getAccountBalance(oa) {
  const settings = useSettingsStore();
  let etherScanProvider = {
    baseUrl: "https://api.etherscan.io/v2/api",
    gasType: "ETH",
    explorerUrl: "https://etherscan.io/tx/",
    apikey: settings.etherscanApikey,
    chainId: 1,
  };
  const balanceApiUrl =
    `${etherScanProvider.baseUrl}?chainId=${etherScanProvider.chainId}&module=account&action=balance&address=` +
    `${oa.address}&tag=latest&apikey=${etherScanProvider.apikey}`;
  const result = await axios.get(balanceApiUrl);
  if (result.data.status != "1") {
    if (debug) console.log("balanceApiUrl: ", balanceApiUrl);
    throw new Error(
      "Invalid return status: " + result.data.message + ":" + result.data.result
    );
  }
  const balance = result.data.result;
  return balance;
};
async function getAccountTransactions(oa, provider) {
  const normalTxApiUrl =
    `${provider.baseUrl}?chainId=${provider.chainId}&module=account&action=txlist&address=` +
    `${oa.address}&startblock=${oa.lastBlockSync + 1}&endblock=${
      provider.currentBlock
    }&sort=asc&apikey=${provider.apikey}`;

  const result = await axios.get(normalTxApiUrl);
  if (
    result.data.status != "1" &&
    result.data.message != "No transactions found"
  ) {
    if (debug) console.log("normalTxApiUrl: ", normalTxApiUrl);

    throw new Error(
      "Invalid return status: " + result.data.message + ":" + result.data.result
    );
  }
  let txs = result.data.result;

  for (const tx of txs) {
    if (tx.timeStamp) {
      tx.timestamp = parseInt(tx.timeStamp);
      tx.to = tx.to.toLowerCase();
      tx.from = tx.from.toLowerCase();
    }
    tx.gasType = provider.gasType;
    //TODO addImportedAccount
    const addresses = useAddressStore();
    const from = addresses.records.find(
      (a) => a.address == tx.from && a.type && a.type.includes("Owned")
    );
    const to = addresses.records.find(
      (a) => a.address == tx.to && a.type && a.type.includes("Owned")
    );
    tx.keep = from || to;
    addresses.set({ address: tx.to, chain: provider.gasType });
    addresses.set({ address: tx.from, chain: provider.gasType });
  }
  return txs.filter((tx) => tx.keep);
}

async function getAccountInternalTransactions(oa, provider) {
  const internalTxApiUrl =
    `${provider.baseUrl}?chainId=${provider.chainId}&module=account&action=txlistinternal&address=` +
    `${oa.address}&startblock=${oa.lastBlockSync + 1}&endblock=${
      provider.currentBlock
    }&sort=asc&apikey=${provider.apikey}`;

  //https://api.etherscan.io/api?module=account&action=txlistinternal&address=0xef5184cd2bbb274d787beab010141a0a85626e7b&startblock=0&endblock=99999999&sort=asc&apikey=9YY3B2WKQU43J5KGAFAJKPCUJ3UYEQVJRF

  const result = await axios.get(internalTxApiUrl);
  if (
    result.data.status != "1" &&
    result.data.message != "No transactions found"
  ) {
    if (debug) console.log("internalTxApiUrl: ", internalTxApiUrl);
    throw new Error(
      "Invalid return status: " + result.data.message + ":" + result.data.result
    );
  }
  let txs = result.data.result;
  for (const tx of txs) {
    if (tx.timeStamp) {
      tx.timestamp = parseInt(tx.timeStamp);
      tx.to = tx.to.toLowerCase();
      if (tx.to == "") {
        tx.to = tx.contractAddress.toLowerCase();
      }
      tx.from = tx.from.toLowerCase();
    }
    tx.gasType = provider.gasType;
    //TODO addImportedAccount
    const addresses = useAddressStore();
    addresses.set({ address: tx.to, chain: provider.gasType });
    addresses.set({ address: tx.from, chain: provider.gasType });
  }
  let hash;
  let seqNo = 0;
  txs = txs.sort((a, b) => {
    return a.timestamp == b.timestamp
      ? a.hash > b.hash
        ? 1
        : -1
      : a.timestamp - b.timestamp;
  });

  for (const it of txs) {
    if (it.hash != hash) seqNo = 0;
    hash = it.hash;
    seqNo += 1;
    it.seqNo = seqNo;
  }

  return txs;
}
async function getMinedBlocks(oa, provider) {
  const minedBlocksUrl =
    `${provider.baseUrl}?chainId=${provider.chainId}&module=account&action=getminedblocks&address=` +
    `${oa.address}&blocktype=blocks&startblock=${oa.lastBlockSync}&endblock=99999999&sort=asc&apikey=${provider.apikey}`;

  let result = await axios.get(minedBlocksUrl);
  if (
    result.data.status != "1" &&
    result.data.message != "No transactions found"
  ) {
    if (debug) console.log("minedBlocksUrl: ", minedBlocksUrl);
    console.log(
      "Invalid return status: " + result.data.message + ":" + result.data.result
    );
    console.log("minedBlocksUrl: ", minedBlocksUrl);
    throw new Error(
      "Invalid return status: " + result.data.message + ":" + result.data.result
    );
  }
  let txs = result.data.result;
  for (const tx of txs) {
    if (tx.timeStamp) {
      tx.timestamp = parseInt(tx.timeStamp);
    }
    tx.gasType = provider.gasType;
    tx.to = oa.address;
    tx.value = tx.blockReward;
    tx.hash = tx.blockNumber;
    tx.gas = "0";
    tx.gasUsed = "0";
    tx.gasPrice = "0";
    tx.from = "0x000000";
    tx.txType = "B";
  }
  sleep(600);
  const minedUnclesUrl =
    `${provider.baseUrl}?chainId=${provider.chainId}&module=account&action=getminedblocks&address=` +
    `${oa.address}&blocktype=uncles&startblock=${oa.lastBlockSync}&endblock=99999999&sort=asc&apikey=${provider.apikey}`;
  result = await axios.get(minedUnclesUrl);
  if (
    result.data.status != "1" &&
    result.data.message != "No transactions found"
  ) {
    console.log(
      "Invalid return status: " + result.data.message + ":" + result.data.result
    );
    console.log("minedUnclesUrl: ", minedUnclesUrl);
    throw new Error(
      "Invalid return status: " + result.data.message + ":" + result.data.result
    );
  }
  let uncleTxs = result.data.result;
  for (const tx of uncleTxs) {
    if (tx.timeStamp) {
      tx.timestamp = parseInt(tx.timeStamp);
    }
    tx.gasType = provider.gasType;
    tx.txType = "U";
    tx.to = oa.address;
    tx.value = tx.blockReward;
    tx.hash = tx.blockNumber;
    tx.gas = "0";
    tx.gasUsed = "0";
    tx.gasPrice = "0";
    tx.from = "0x000000";
  }
  return txs.concat(uncleTxs);
}
export const getTransactions = async function () {
  const app = useAppStore();
  app.importing = true;
  app.importingMessage = "Importing transactions from scan providers...";
  try {
    const scanProviders = getScanProviders();
    const result = {
      accountTxs: [],
      internalTxs: [],
      tokenTxs: [],
      minedBlocks: [],
    };
    for (let i = 0; i < scanProviders.length; i++) {
      const provider = scanProviders[i];
      if (provider.chainId == 56) continue; //TODO remove to enable bsc
      const txs = await getProviderTransactions(provider);
      result.accountTxs = result.accountTxs.concat(txs.accountTxs);
      result.internalTxs = result.internalTxs.concat(txs.internalTxs);
      result.tokenTxs = result.tokenTxs.concat(txs.tokenTxs);
      result.minedBlocks = result.minedBlocks.concat(txs.minedBlocks);
    }
    result.tokenTxs = result.tokenTxs.sort(
      (a, b) => a.blockNumber - b.blockNumber
    );
    return result;
  } finally {
    app.importing = false;
  }
};
export const getProviderTransactions = async function (provider) {
  const addresses = useAddressStore();

  const ownedAccounts = addresses.records.filter(
    (a) => a.type == "Owned" && a.chain == provider.gasType
  );

  //loop through "Owned accounts"
  const currentBlock = await getCurrentBlock(provider);
  const result = {
    accountTxs: [],
    internalTxs: [],
    tokenTxs: [],
    minedBlocks: [],
  };
  for (let i = 0; i < ownedAccounts.length; i++) {
    const oa = ownedAccounts[i];
    try {
      //get normal tx's
      lastRequestTime = await throttle(lastRequestTime, 1000);
      result.accountTxs = result.accountTxs.concat(
        await getAccountTransactions(oa, provider)
      );
      lastRequestTime = await throttle(lastRequestTime, 1000);
      result.internalTxs = result.internalTxs.concat(
        await getAccountInternalTransactions(oa, provider)
      );
      lastRequestTime = await throttle(lastRequestTime, 1000);
      result.tokenTxs = result.tokenTxs.concat(
        await getTokenTransactions(oa, provider)
      );
      lastRequestTime = await throttle(lastRequestTime, 1000);
      result.minedBlocks = result.minedBlocks.concat(
        await getMinedBlocks(oa, provider)
      );

      //setLastBlockSync
      //TODO only set if no error
      oa.lastBlockSync = currentBlock;
      let rec = Object.assign({}, oa);
      rec.lastBlockSync = currentBlock;
      addresses.set(rec);

      if (provider.chainId != 1) {
        //find max tx block number
      }
    } catch (err) {
      console.log("error getting txs: ", err);
      throw err;
    }
  }

  const contractAccounts = addresses.records.filter(
    (a) =>
      a.type == "Contract Owned" &&
      a.chain == provider.gasType &&
      a.skipInternal != true
  );

  for (const ca of contractAccounts) {
    try {
      lastRequestTime = await throttle(lastRequestTime, 1000);
      result.internalTxs = result.internalTxs.concat(
        await getAccountInternalTransactions(ca, provider)
      );
      //setLastBlockSync
      ca.lastBlockSync = currentBlock;
    } catch (err) {
      console.log("error getting txs: ", err);
    }
  }
  return result;
};
export const getCurrentBlock = async function (provider) {
  if (provider.chainId != 1) return 0;
  const timestamp = Math.round(new Date().getTime() / 1000);
  const apiUrl = `${provider.baseUrl}?chainId=${provider.chainId}&module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${provider.apikey}`;
  try {
    const result = await axios.get(apiUrl);

    if (result.data.status != "1") {
      if (debug) console.log("currentBlockUrl: ", apiUrl);
      throw new Error(
        "Invalid return status: " +
          result.data.message +
          ":" +
          result.data.result
      );
    }

    const currentBlock = parseInt(result.data.result);
    provider.currentBlock = currentBlock;
    return currentBlock;
  } catch (err) {
    //if (debug) console.log("currentBlockUrl: ", apiUrl);
    //console.log("error getting current block: ", err);
    throw err;
  }
};
