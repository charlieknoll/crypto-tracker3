import axios from "axios";
import { useAddressStore } from "src/stores/address-store";
import { useAppStore } from "src/stores/app-store";
import { useSettingsStore } from "src/stores/settings-store";
import { throttle } from "../utils/cacheUtils";
let lastRequestTime = 0;

function getScanProviders() {
  const settings = useSettingsStore();
  const result = [];
  let etherScanProvider = {
    baseUrl: "https://api.etherscan.io/api",
    gasType: "ETH",
    explorerUrl: "https://etherscan.io/tx/",
    apikey: settings.etherscanApikey,
  };
  let bscScanProvider = {
    baseUrl: "https://api.bscscan.com/api",
    gasType: "BNB",
    apikey: settings.bscApikey,
    explorerUrl: "https://bscscan.com/tx/",
  };
  result.push(etherScanProvider);
  result.push(bscScanProvider);
  return result;
}

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
    }
    tx.gasType = provider.gasType;
    //TODO addImportedAccount
    actions.addImportedAddress({ address: tx.to }, provider.gasType);
    actions.addImportedAddress({ address: tx.from }, provider.gasType);
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
  const txs = result.data.result;
  const addresses = useAddressStore();

  for (const tx of txs) {
    if (tx.timeStamp) {
      tx.timestamp = parseInt(tx.timeStamp);
    }
    tx.gasType = provider.gasType;
    //TODO addImportedAccount
    addresses.set({ address: tx.to, chain: provider.gasType });
    addresses.set({ address: tx.from, chain: provider.gasType });
  }
  //There will be multiple txs for transfers between owned accounts so tx's must be merged
  return txs;
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
  const txs = result.data.result;
  for (const tx of txs) {
    if (tx.timeStamp) {
      tx.timestamp = parseInt(tx.timeStamp);
    }
    tx.gasType = provider.gasType;
    //TODO addImportedAccount
    actions.addImportedAddress({ address: tx.to }, provider.gasType);
    actions.addImportedAddress({ address: tx.from }, provider.gasType);
  }
  //There will be multiple txs for transfers between owned accounts so tx's must be merged
  actions.mergeArrayToData(
    "internalTransactions",
    txs,
    (a, b) => a.hash == b.hash
  );
}
export const getTransactions = async function () {
  const scanProviders = getScanProviders();
  const result = {
    accountTxs: [],
    internalTxs: [],
    tokenTxs: [],
  };
  for (let i = 0; i < scanProviders.length; i++) {
    const provider = scanProviders[i];
    const txs = await getChainTransactions(provider);
    result.accountTxs.push(txs.accountTxs);
    result.internalTxs.push(txs.internalTxs);
    result.tokenTxs.push(txs.tokenTxs);
  }
};
export const getChainTransactions = async function (provider) {
  const addresses = useAddressStore();

  const ownedAccounts = addresses.records.filter(
    (a) => a.type == "Owned" && a.chain == provider.gasType
  );

  //loop through "Owned accounts"
  const currentBlock = await getCurrentBlock(provider);
  const result = {};
  for (const oa of ownedAccounts) {
    try {
      //get normal tx's
      lastRequestTime = await throttle(lastRequestTime, 500);
      result.accountTxs = await getAccountTransactions(oa, provider);
      // lastRequestTime = await throttle(lastRequestTime, 500);
      // result.internalTxs = await getAccountInternalTransactions(oa, provider);
      // lastRequestTime = await throttle(lastRequestTime, 500);
      // result.tokenTxs = await getTokenTransactions(oa, provider);
      //setLastBlockSync
      oa.lastBlockSync = currentBlock;
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
