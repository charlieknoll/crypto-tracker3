import axios from "axios";
import { useAddressStore } from "src/stores/address-store";
import { useAppStore } from "src/stores/app-store";
import { useSettingsStore } from "src/stores/settings-store";
import { sleep, throttle } from "../utils/cacheUtils";
let lastRequestTime = 0;

import { getScanProviders } from "./scan-providers";

async function getTokenTransactions(oa, provider, startBlock) {
  const tokenTxApiUrl =
    `${provider.baseUrl}?module=account&action=tokentx&address=` +
    `${oa.address}&startblock=${startBlock}&endblock=99999999&sort=asc&apikey=${provider.apikey}`;

  const result = await axios.get(tokenTxApiUrl);
  if (
    result.data.status != "1" &&
    result.data.message != "No transactions found"
  ) {
    throw new Error("Invalid return status: " + result.data.message);
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
async function getAccountTransactions(oa, provider, startBlock) {
  const normalTxApiUrl =
    `${provider.baseUrl}?module=account&action=txlist&address=` +
    `${oa.address}&startblock=${startBlock}&endblock=99999999&sort=asc&apikey=${provider.apikey}`;

  const result = await axios.get(normalTxApiUrl);
  if (
    result.data.status != "1" &&
    result.data.message != "No transactions found"
  ) {
    throw new Error("Invalid return status: " + result.data.message);
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
      (a) => a.address == tx.from && a.type.includes("Owned")
    );
    const to = addresses.records.find(
      (a) => a.address == tx.to && a.type.includes("Owned")
    );
    tx.keep = from || to;
    addresses.set({ address: tx.to, chain: provider.gasType });
    addresses.set({ address: tx.from, chain: provider.gasType });
  }
  return txs.filter((tx) => tx.keep);
}

async function getAccountInternalTransactions(oa, provider, startBlock) {
  const internalTxApiUrl =
    `${provider.baseUrl}?module=account&action=txlistinternal&address=` +
    `${oa.address}&startblock=${startBlock}&endblock=99999999&sort=asc&apikey=${provider.apikey}`;

  //https://api.etherscan.io/api?module=account&action=txlistinternal&address=0xef5184cd2bbb274d787beab010141a0a85626e7b&startblock=0&endblock=99999999&sort=asc&apikey=9YY3B2WKQU43J5KGAFAJKPCUJ3UYEQVJRF

  const result = await axios.get(internalTxApiUrl);
  if (
    result.data.status != "1" &&
    result.data.message != "No transactions found"
  ) {
    throw new Error("Invalid return status: " + result.data.message);
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
async function getMinedBlocks(oa, provider, startBlock) {
  const minedBlocksUrl =
    `${provider.baseUrl}?module=account&action=getminedblocks&address=` +
    `${oa.address}&blocktype=blocks&startblock=${startBlock}&endblock=99999999&sort=asc&apikey=${provider.apikey}`;

  let result = await axios.get(minedBlocksUrl);
  if (
    result.data.status != "1" &&
    result.data.message != "No transactions found"
  ) {
    throw new Error("Invalid return status: " + result.data.message);
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
  const minedUnclesUrl =
    `${provider.baseUrl}?module=account&action=getminedblocks&address=` +
    `${oa.address}&blocktype=uncles&startblock=${startBlock}&endblock=99999999&sort=asc&apikey=${provider.apikey}`;
  result = await axios.get(minedUnclesUrl);
  if (
    result.data.status != "1" &&
    result.data.message != "No transactions found"
  ) {
    throw new Error("Invalid return status: " + result.data.message);
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
  for (const oa of ownedAccounts) {
    try {
      //get normal tx's
      lastRequestTime = await throttle(lastRequestTime, 500);
      result.accountTxs = result.accountTxs.concat(
        await getAccountTransactions(oa, provider)
      );
      lastRequestTime = await throttle(lastRequestTime, 500);
      result.internalTxs = result.internalTxs.concat(
        await getAccountInternalTransactions(oa, provider)
      );
      lastRequestTime = await throttle(lastRequestTime, 500);
      result.tokenTxs = result.tokenTxs.concat(
        await getTokenTransactions(oa, provider)
      );
      lastRequestTime = await throttle(lastRequestTime, 500);
      result.minedBlocks = result.minedBlocks.concat(
        await getMinedBlocks(oa, provider)
      );

      //setLastBlockSync
      oa.lastBlockSync = currentBlock;
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
      lastRequestTime = await throttle(lastRequestTime, 500);
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
  const timestamp = Math.round(new Date().getTime() / 1000);
  const apiUrl = `${provider.baseUrl}?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${provider.apikey}`;
  try {
    const result = await axios.get(apiUrl);
    if (result.data.status != "1")
      throw new Error("Invalid return status: " + result.data.message);
    const currentBlock = parseInt(result.data.result);

    return currentBlock;
  } catch (err) {
    console.log("error getting current block: ", err);
  }
};
