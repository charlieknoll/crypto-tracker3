import { formatEther } from "ethers";

export function redistributeLotsToAccounts(
  undisposedLots,
  runningBalances,
  cutoffTimestamp
) {
  let targetBalances = {};
  const cutoffDate = new Date(cutoffTimestamp * 1000)
    .toISOString()
    .split("T")[0];
  runningBalances.forEach((rb) => {
    if (rb.timestamp <= cutoffTimestamp) {
      const key = `${rb.account}:${rb.asset}`;
      const firstSeen = targetBalances[key]?.timestamp || rb.timestamp;
      targetBalances[key] = {
        account: rb.account,
        asset: rb.asset,
        balance: rb.biRunningAccountBalance,
        timestamp: rb.timestamp,
        firstSeen: firstSeen,
      };
    }
  });
  // Sort target balances by first seen timestamp to ensure deterministic processing order
  targetBalances = Object.fromEntries(
    Object.entries(targetBalances).sort(
      (a, b) => a[1].firstSeen - b[1].firstSeen
    )
  );

  const lotsByAsset = {};
  undisposedLots.forEach((lot) => {
    if (!lotsByAsset[lot.asset]) {
      lotsByAsset[lot.asset] = [];
    }
    lotsByAsset[lot.asset].push(lot);
  });

  const virtualTransfers = [];

  Object.keys(lotsByAsset).forEach((asset) => {
    const lots = lotsByAsset[asset];
    let lotIndex = 0;

    const accountsNeedingAsset = Object.values(targetBalances)
      .filter((fb) => fb.asset === asset && fb.balance > BigInt("0"))
      .sort((a, b) => a.account.localeCompare(b.account));

    accountsNeedingAsset.forEach((targetAccount) => {
      let remainingNeeded = targetAccount.balance;

      while (remainingNeeded > BigInt("0") && lotIndex < lots.length) {
        const lot = lots[lotIndex];
        const transferAmount =
          lot.remainingAmount <= remainingNeeded
            ? lot.remainingAmount
            : remainingNeeded;

        if (lot.account !== targetAccount.account) {
          virtualTransfers.push({
            txId: `VT-${cutoffDate}-${lot.id}-${targetAccount.account}`,
            timestamp: cutoffTimestamp,
            fromAccount: lot.account,
            toAccount: targetAccount.account,
            asset: asset,
            amount: transferAmount,
            fee: 0.0,
            type: "VIRTUAL-TRANSFER",
            taxTxType: "TRANSFER",
            sort: 0,
            id: `virtual-${Date.now()}-${lotIndex}-${targetAccount.account}`,
          });
          lot.account = targetAccount.account;
        }

        remainingNeeded -= transferAmount;
        if (lot.remainingAmount <= remainingNeeded) {
          lotIndex++;
        } else {
          break;
        }
      }

      if (remainingNeeded > BigInt("0")) {
        console.warn(
          `Insufficient lots to fulfill ${targetAccount.account}:${asset}. ` +
            `Needed: ${formatEther(remainingNeeded)}`
        );
      }
    });
  });

  return virtualTransfers;
}

/**
 * Redistributes held lots from address accounts to their wallet names
 * @param {Array} undisposedLots - Current undisposed lots
 * @param {Array} addresses - Address records with name and wallet properties
 * @param {number} cutoffTimestamp - Timestamp for the virtual transfers
 * @returns {Array} Virtual transfer transactions to process
 */
export function redistributeLotsToWallets(
  undisposedLots,
  addresses,
  cutoffTimestamp
) {
  // Filter addresses that have wallet names assigned
  const addressesToWalletMap = {};
  addresses.forEach((addr) => {
    if (addr.wallet && addr.name && addr.wallet !== addr.name) {
      addressesToWalletMap[addr.name] = addr.wallet;
    }
  });

  const virtualTransfers = [];
  let transferId = 0;

  // Group lots by account
  const lotsByAccount = {};
  undisposedLots.forEach((lot) => {
    if (!lotsByAccount[lot.account]) {
      lotsByAccount[lot.account] = [];
    }
    lotsByAccount[lot.account].push(lot);
  });

  // For each account that maps to a wallet, create virtual transfers
  Object.keys(addressesToWalletMap).forEach((addressName) => {
    const walletName = addressesToWalletMap[addressName];
    const lots = lotsByAccount[addressName] || [];

    lots.forEach((lot, index) => {
      if (lot.remainingAmount > BigInt("0")) {
        virtualTransfers.push({
          txId: `VW-${addressName}-${walletName}-${lot.id}`,
          timestamp: cutoffTimestamp,
          fromAccount: addressName,
          toAccount: walletName,
          asset: lot.asset,
          amount: lot.remainingAmount,
          fee: 0.0,
          type: "VIRTUAL-WALLET-TRANSFER",
          taxTxType: "TRANSFER",
          sort: 0,
          id: `virtual-wallet-${cutoffTimestamp}-${transferId++}`,
        });
      }
    });
  });

  return virtualTransfers;
}
