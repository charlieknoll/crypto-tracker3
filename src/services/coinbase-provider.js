import { store } from "../boot/store";
import { actions } from "../boot/actions";
import { throttle } from "../utils/cacheUtils";

import { AuthenticatedClient } from "./cb/clients/authenticated";
import { Notify } from "quasar";
import { getPrice } from "./price-provider";
let lastRequestTime = 0;
function mapConversions(history, account) {
  return history
    .filter((h) => h.type == "conversion")
    .map((c) => {
      const tx = {};
      tx.txId = c.details.conversion_id;
      const tradeDate = new Date(c.created_at);
      tx.timestamp = tradeDate.getTime() / 1000;
      tx.date = c.created_at.substring(0, 10);
      tx.account = "Coinbase Pro";
      tx.asset = account.currency;
      tx.volume = parseFloat(c.amount);
      tx.action = tx.volume > 0 ? "BUY" : "SELL";
      tx.price = 1.0;
      tx.fee = 0.0;
      tx.feeCurrency = "USD";
      tx.currency = "USD";
      return tx;
    });
}
function mapFills(fills, account) {
  return fills.map((f) => {
    const tx = {};
    tx.txId = "" + f.trade_id;
    const tradeDate = new Date(f.created_at);
    tx.timestamp = tradeDate.getTime() / 1000;
    tx.date = f.created_at.substring(0, 10);
    tx.account = tx.date < "2018-06-30" ? "GDAX" : "Coinbase Pro";
    tx.asset = f.product_id.split("-")[0];
    tx.volume = parseFloat(f.size);
    tx.action = f.side.toUpperCase();
    tx.price = parseFloat(f.price);
    tx.fee = parseFloat(f.fee);
    tx.feeCurrency = f.product_id.split("-")[1];
    tx.currency = f.product_id.split("-")[1];
    return tx;
  });
}

async function processAccount(
  authedClient,
  account,
  productIds,
  accountHistory,
  trades,
  fullDownload
) {
  let accountBefore;
  let after = 1;
  while (after > 0) {
    let args = {};
    if (after != 1) {
      args.after = after;
    } else {
      //first time through set before and reset account after
      accountBefore = accountHistory.find((ah) => ah.accountId == account.id);
      if (accountBefore && accountBefore.before && !fullDownload) {
        args.before = accountBefore.before;
      }
      if (!accountBefore) {
        accountBefore = { accountId: account.id, before: null };
        accountHistory.push(accountBefore);
      }
    }
    lastRequestTime = await throttle(lastRequestTime, 200);
    const _history = await authedClient.getAccountHistory(account.id, args);

    //Only set the first time
    if (authedClient.before && after == 1) {
      accountBefore.before = authedClient.before;
    }
    for (const h of _history.filter((h) => h.type == "match")) {
      if (productIds.findIndex((p) => p.id == h.details.product_id) == -1) {
        productIds.push({
          id: h.details.product_id,
          before: null,
        });
      }
    }
    trades.push(...mapConversions(_history, account));
    after = authedClient.after ?? 0;
  }
}
async function processProductId(authedClient, productId, trades, fullDownload) {
  let after = 1;
  while (after > 0) {
    let args = { product_id: productId.id };
    if (after != 1) {
      args.after = after;
    } else if (productId.before && !fullDownload) {
      args.before = productId.before;
    }
    lastRequestTime = await throttle(lastRequestTime, 200);
    const _fills = await authedClient.getFills(args);
    trades.push(...mapFills(_fills));
    if (authedClient.before && after == 1) {
      productId.before = authedClient.before;
    }
    after = authedClient.after ?? 0;
  }
}

async function getFees(authedClient, accounts, before, fullDownload) {
  let after = 1;
  fullDownload = true;
  let fees = [];
  while (after > 0) {
    let args = { type: "withdraw" };
    if (after != 1) {
      args.after = after;
    } else if (before && !fullDownload) {
      args.before = before;
    }
    lastRequestTime = await throttle(lastRequestTime, 200);
    const _transfers = await authedClient.getTransfers(args);
    fees.push(
      ..._transfers
        .filter((t) => parseFloat(t.details.fee) > 0.0)
        .map((t) => {
          const fee = {};
          fee.accountId = t.account_id;
          let transferDate = new Date(t.created_at.substring(0, 19));
          transferDate = new Date(t.created_at);
          fee.timestamp = new Date(transferDate).getTime() / 1000;
          fee.date = t.completed_at.substring(0, 10);
          fee.ethAccount = t.details.sent_to_address;
          fee.amount = parseFloat(t.details.fee);
          fee.fee = 0.0;
          fee.asset = accounts.find((a) => a.id == t.account_id).currency;
          fee.hash = t.details.crypto_transaction_hash;
          fee.txId = t.id;
          fee.account = "Coinbase Pro";
          fee.action = "TF:" + fee.asset;
          return fee;
        })
    );
    //set gross
    for (const f of fees) {
      f.gross = f.amount * (await getPrice(f.asset, f.date));
    }
    if (authedClient.before && after == 1) {
      before = authedClient.before;
    }
    after = authedClient.after ?? 0;
  }
  return { fees, before };
}

export const importCbpTrades = async function (fullDownload) {
  const apikey = store.settings.cbpApikey;
  const passphrase = store.settings.cbpPassphrase;
  const secret = store.settings.cbpSecret;
  const apiUrl = window.location.origin + "/cbp-api";

  const authedClient = new AuthenticatedClient(
    apikey,
    secret,
    passphrase,
    apiUrl
  );
  let accounts;
  const productIds = actions.getData("productIds") ?? [];
  const accountHistory = actions.getData("accountHistory") ?? [];

  const trades = [];

  try {
    accounts = await authedClient.getAccounts();
    const { fees } = await getFees(authedClient, accounts, null, true);
    //build list of productIds using account history
    for (const account of accounts) {
      if (account.currency == "USD") continue;
      await processAccount(
        authedClient,
        account,
        productIds,
        accountHistory,
        trades,
        fullDownload
      );
    }
    //productIds.push({ id: "ETH-USD" });
    for (const productId of productIds) {
      await processProductId(authedClient, productId, trades, fullDownload);
    }
    //const fees = await getFees(authedClient, null, true);

    //TODO get transfer fees (withdraw)
    console.log(trades);

    actions.setData("productIds", productIds);
    actions.setData("accountHistory", accountHistory);
    actions.setData("exchangeTransferFees", fees);
    actions.mergeArrayToData(
      "exchangeTrades",
      trades,
      (a, b) => a.account + a.txId == b.account + b.txId
    );

    return trades.length;
  } catch (error) {
    Notify.create({
      message: error.message,
      color: "negative",
      actions: [{ label: "Dismiss", color: "white" }],
      timeout: 0,
    });
    return -1;
  }
  //merge trades to data

  //TODO use account + txId
};
