import axios from "axios";
import { store } from "../boot/store";
import { actions } from "../boot/actions";
import { throttle } from "../utils/cacheUtils";
let lastRequestTime = 0;
export const scanProviders = [];
let etherScanProvider = {
  baseUrl: "https://api.etherscan.io/api",
  gasType: "ETH",
  explorerUrl: "https://etherscan.io/tx/",
  apikey: store.settings.apikey,
};
let bscScanProvider = {
  baseUrl: "https://api.bscscan.com/api",
  gasType: "BNB",
  apikey: store.settings.bscApikey,
  explorerUrl: "https://bscscan.com/tx/",
};
scanProviders.push(etherScanProvider);
scanProviders.push(bscScanProvider);

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
    "chainTransactions",
    txs,
    (a, b) => a.hash == b.hash
  );
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

export const getTransactions = async function (provider) {
  const ownedAccounts = store.addresses.filter(
    (a) =>
      a.type == "Owned" &&
      a.chains.replaceAll(" ", "").split(",").indexOf(provider.gasType) > -1
  );
  const blockSyncPropName = `last${provider.gasType}BlockSync`;
  //loop through "Owned accounts"
  const currentBlock = await getCurrentBlock(provider);
  let tokenTxs = [...(actions.getData("tokenTransactions") ?? [])];

  for (const oa of ownedAccounts) {
    try {
      //get normal tx's
      lastRequestTime = await throttle(lastRequestTime, 500);
      await getAccountTransactions(oa, provider, oa[blockSyncPropName]);
      lastRequestTime = await throttle(lastRequestTime, 500);
      await getAccountInternalTransactions(oa, provider, oa[blockSyncPropName]);
      lastRequestTime = await throttle(lastRequestTime, 500);
      tokenTxs = tokenTxs.concat(
        await getTokenTransactions(oa, provider, oa[blockSyncPropName])
      );
      //setLastBlockSync
      oa[blockSyncPropName] = currentBlock;
    } catch (err) {
      console.log("error getting txs: ", err);
    }
  }

  actions.setObservableData("addresses", store.addresses);
  tokenTxs.sort((a, b) => a.timestamp - b.timestamp);
  actions.setData("tokenTransactions", tokenTxs);
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
