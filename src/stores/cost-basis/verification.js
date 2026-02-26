import { formatEther } from "ethers";

export function verifyBalance(
  tx,
  runningBalances,
  undisposedLots,
  soldLots,
  unreconciledAccounts
) {
  // if (undisposedLots.length == 6) {
  //   console.log(undisposedLots);
  // }

  //running balances handles gas fees as part of transfer but cost basis consideres them spent before transfer
  //so wait to verify balance on next tx
  if (tx.sort <= -1) return unreconciledAccounts;

  const calculatedBalance = undisposedLots.reduce((sum, lot) => {
    if (lot.account == tx.account && lot.asset == tx.asset) {
      return BigInt(sum) + BigInt(lot.remainingAmount);
    }
    return BigInt(sum);
  }, BigInt("0"));

  const relevantBalanceRec = runningBalances.find(
    (rb) =>
      rb.account == tx.account &&
      rb.asset == tx.asset &&
      rb.timestamp == tx.timestamp &&
      rb.biRunningAccountBalance == calculatedBalance
  );
  if (!relevantBalanceRec) {
    //debugger;
    unreconciledAccounts.push({
      account: tx.account,
      asset: tx.asset,
      timestamp: tx.timestamp,
    });
  }
  // else {
  //   if (tx.account == "Poloniex" && tx.asset == "BTC") {
  //     console.log(
  //       `${new Date(tx.timestamp * 1000).toString()} ${tx.id.substring(
  //         0,
  //         20
  //       )}: txAmount: ${formatEther(tx.amount)}, rbAmount: ${formatEther(
  //         relevantBalanceRec.biAmount
  //       )} rb: ${formatEther(relevantBalanceRec.biRunningAccountBalance)} `
  //     );
  //   }
  // }
  // if (!unreconciledAccounts.filter) {
  //   debugger;
  // }
  // unreconciledAccounts = unreconciledAccounts.filter(
  //   (ua) => !(ua.account == tx.account && ua.asset == tx.asset)
  // );
  return unreconciledAccounts;
}

export function verifyAssetBalance(
  timestamp,
  asset,
  runningBalances,
  undisposedLots
) {
  const calculatedBalance = undisposedLots.reduce((sum, lot) => {
    if (lot.asset == asset) {
      return BigInt(sum) + BigInt(lot.remainingAmount);
    }
    return BigInt(sum);
  }, BigInt("0"));
  const runningBalance = runningBalances.reduce((sum, rb) => {
    if (rb.asset == asset && rb.timestamp <= timestamp) {
      return BigInt(sum) + BigInt(rb.biAmount);
    }
    return BigInt(sum);
  }, BigInt("0"));
  const diff = formatEther(calculatedBalance - runningBalance);
  return calculatedBalance - runningBalance;
}

export function verifyBalances(
  undisposedLots,
  runningBalances,
  cutoffTimestamp
) {
  const accountAssets = [];
  runningBalances
    .filter((rb) => rb.timestamp <= cutoffTimestamp)
    .forEach((rb) => {
      let accountAsset = accountAssets.find(
        (aa) => aa.account == rb.account && aa.asset == rb.asset
      );
      if (!accountAsset) {
        accountAssets.push({
          account: rb.account,
          asset: rb.asset,
          balance: rb.biAmount,
        });
      } else {
        accountAsset.balance = accountAsset.balance + rb.biAmount;
      }
    });

  let unreconciledAccounts = [];
  accountAssets.forEach((aa) => {
    const calculatedBalance = undisposedLots.reduce((sum, lot) => {
      if (lot.account == aa.account && lot.asset == aa.asset) {
        return BigInt(sum) + BigInt(lot.remainingAmount);
      }
      return BigInt(sum);
    }, BigInt("0"));

    if (calculatedBalance != aa.balance) {
      unreconciledAccounts.push({
        account: aa.account,
        asset: aa.asset,
        rbBalance: aa.balance,
        calculatedBalance: calculatedBalance,
        date: new Date(cutoffTimestamp * 1000).toString(),
      });
    }
  });
  return unreconciledAccounts;
}

export function checkPrice(price, asset, timestamp, currency) {
  return;
  if (!price)
    throw new Error(
      `Price not set for ${asset}:${currency} at ${new Date(
        timestamp * 1000
      ).toString()} `
    );
}

export function handleError(tx, source, error) {
  console.log(tx);
  console.log("Source:");
  console.log(source);
  throw new Error(error);
}
