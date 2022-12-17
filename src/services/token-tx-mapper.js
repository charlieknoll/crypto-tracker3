import { getTokenTaxCode } from "./tax-code-mapper";
import { multiplyCurrency, sBnToFloat } from "src/utils/number-helpers";
import { timestampToDateStr } from "src/utils/date-helper";
import { BigNumber } from "ethers";
import { useAddressStore } from "src/stores/address-store";
import { useMethodStore } from "src/stores/methods-store";
import { usePricesStore } from "src/stores/prices-store";
import { useSettingsStore } from "src/stores/settings-store";
import { stringToArray } from "src/utils/array-helpers";

const mergeByHashSet = function (target, source) {
  let txs = JSON.parse(JSON.stringify(target));
  //Only keep txs in target where hash doesn't exist in source
  txs = txs.filter((t) => source.findIndex((rt) => rt.hash == t.hash) == -1);
  //Concat source to target
  return txs.concat(source);
};

function initParentTransaction(parentTx) {
  parentTx.txCt = 0;
  parentTx.inTokenTxs = [];
  parentTx.outTokenTxs = [];
  parentTx.otherTokenTxs = [];
  parentTx.usdProceeds = 0.0;
  parentTx.usdSpent = 0.0;
}
function distributeFee(pt) {
  const allTxs = pt.inTokenTxs.concat(pt.outTokenTxs).concat(pt.otherTokenTxs);
  const feeTxs = [];
  for (const t of allTxs) {
    if (!t.tracked) continue;
    if (t.amount != 0.0) {
      feeTxs.push(t);
    } else {
      t.fee = 0.0;
    }
  }
  for (const t of feeTxs) {
    t.fee = pt.fee / feeTxs.length;
  }
}

function getOwnedState(tokenTx) {
  const fromOwned =
    tokenTx?.fromAccount?.type?.toLowerCase().includes("owned") != undefined;
  const toOwned =
    tokenTx?.toAccount?.type?.toLowerCase().includes("owned") != undefined;
  return { fromOwned, toOwned };
}
function setParentFields(tokenTx) {
  const { fromOwned, toOwned } = getOwnedState(tokenTx);
  if (toOwned && !fromOwned) {
    tokenTx.parentTx.inTokenTxs.push(tokenTx);
    tokenTx.parentTx.usdSpent += tokenTx.gross;
    return;
  }
  if (fromOwned && !toOwned) {
    tokenTx.parentTx.outTokenTxs.push(tokenTx);
    tokenTx.parentTx.usdProceeds += tokenTx.gross;
  }
  if (fromOwned && toOwned) {
    tokenTx.parentTx.otherTokenTxs.push(tokenTx);
    //no taxable event for transfer
    tokenTx.gross == 0.0;
  }
}
function setTokenFields(tokenTx, trackedTokens, prices) {
  tokenTx.methodName = tokenTx.parentTx.methodName;

  tokenTx.gross = 0.0;
  tokenTx.marketGross = 0.0;
  tokenTx.price = 0.0;
  if (tokenTx.tracked) {
    tokenTx.price = prices.getPrice(
      tokenTx.asset,
      tokenTx.date,
      tokenTx.timestamp
    );
    tokenTx.gross = multiplyCurrency([tokenTx.amount, tokenTx.price]);
    setParentFields(tokenTx);
    tokenTx.taxCode = getTokenTaxCode(tokenTx);
  }
}
function setTrackedTokens(tokenTxs, trackedTokens) {
  for (let i = 0; i < tokenTxs.length; i++) {
    const tokenTx = tokenTxs[i];
    if (!tokenTx.asset) continue;
    if (["ETH", ""].indexOf(tokenTx.asset.trim()) > -1) continue;
    //TODO fix spammy token transfers mimic ing comimg from owned account, https://etherscan.io/tx/0xc9de07ab8727ebe8ef9d788380ab8755ba0f6245333dd360b1b40e88acb5d569
    if (tokenTx.asset.includes("tinyurl")) continue;
    if (tokenTx.fromAccount?.type?.toLowerCase().includes("owned")) {
      if (trackedTokens.findIndex((tt) => tt == tokenTx.asset) == -1) {
        trackedTokens.push(tokenTx.asset);
      }
    }
  }

  tokenTxs.map((mtx) => {
    mtx.tracked = trackedTokens.findIndex((asset) => asset == mtx.asset) > -1;
  });
}

function init(tx, parentTx, addresses) {
  //const tracked = trackedTokens.findIndex((asset) => asset == tx.asset) > -1;
  parentTx.txCt += 1;
  //this should handle interal txs creating token txs
  let id = parentTx.id + "-" + parentTx.txCt;
  const suffix = (parentTx.suffix ?? "") + "-" + parentTx.txCt;

  const toAccount = addresses.find((a) => a.address == tx.to);
  const fromAccount = addresses.find((a) => a.address == tx.from);

  const to =
    toAccount && toAccount.name != tx.to
      ? toAccount.name
      : tx.to.substring(0, 8);
  const toAddress = toAccount ? toAccount.address : tx.to;
  const from =
    fromAccount && fromAccount.name != tx.from
      ? fromAccount.name
      : tx.from.substring(0, 8);
  const fromAddress = fromAccount ? fromAccount.address : tx.from;
  const date = timestampToDateStr(tx.timeStamp);
  const timestamp = parseInt(tx.timeStamp);
  const asset = tx.tokenSymbol;
  const gasType = tx.gasType;
  const gas = 0.0;
  const tokenDecimal = tx.tokenDecimal;
  const hash = tx.hash.toLowerCase();
  const bnAmount = BigNumber.from(tx.value);
  const amount = sBnToFloat(tx.value, parseFloat(tokenDecimal));

  return {
    id,
    suffix,
    asset,
    parentTx,
    tokenDecimal,
    hash,
    toAccount,
    toAccountName: to,
    toAddress,
    fromAccount,
    fromAccountName: from,
    fromAddress,
    bnAmount,
    amount,
    gas,
    gasType,
    timestamp,
    tracked: false,
    date,
    txType: "T",
  };
}
const getTokenTxs = function (chainTxs, rawTokenTxs) {
  const addresses = useAddressStore();
  const settings = useSettingsStore();
  const prices = usePricesStore();
  let trackedTokens = stringToArray(settings.trackedTokens, ",");

  trackedTokens = trackedTokens.concat(
    stringToArray(settings.baseCurrencies, ",")
  );
  let mappedTxs = [];
  const parentTxs = JSON.parse(
    JSON.stringify(
      chainTxs.filter(
        (ct) => rawTokenTxs.findIndex((rt) => rt.hash == ct.hash) > -1
      )
    )
  );
  parentTxs.map((pt) => initParentTransaction(pt));
  const sortedRawTokenTxs = rawTokenTxs.sort((a, b) => a.hash > b.hash);
  for (let i = 0; i < sortedRawTokenTxs.length; i++) {
    const rawTokenTx = sortedRawTokenTxs[i];
    let parentTx = parentTxs.find((pt) => pt.hash == rawTokenTx.hash);
    if (!parentTx) {
      //handle token txs initiated by non owned accounts
      parentTx = { id: rawTokenTx.hash };
      initParentTransaction(parentTx);
    }
    //make a non reactive copy
    const tokenTx = init(rawTokenTx, parentTx, addresses.records);
    if (tokenTx.fromAccount?.type == "Spam") continue;
    mappedTxs.push(tokenTx);
  }

  if (settings.trackSpentTokens) {
    setTrackedTokens(mappedTxs, trackedTokens);
  }
  mappedTxs = mappedTxs.filter((mtx) => mtx.tracked);
  mappedTxs.map((tokenTx) => setTokenFields(tokenTx, trackedTokens, prices));
  //distribute baseCurrency costs/proceeds and fees to non baseCurrency
  for (const pt of parentTxs) {
    distributeFee(pt);
  }
  return mappedTxs;
};

export { getTokenTxs, mergeByHashSet };
