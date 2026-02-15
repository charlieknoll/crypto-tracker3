import { formatEther } from "ethers";
import { currencyRounded } from "src/utils/number-helpers";

export function redistributeLotsToAccounts(
  undisposedLotsParam,
  runningBalances,
  cutoffTimestamp
) {
  let accountBalances = {};
  let undisposedLots = undisposedLotsParam.filter(
    (lot) => lot.remainingAmount > BigInt("0")
  );

  const cutoffDate = new Date(cutoffTimestamp * 1000)
    .toISOString()
    .split("T")[0];
  runningBalances.forEach((rb) => {
    if (rb.timestamp <= cutoffTimestamp) {
      const key = `${rb.account}:${rb.asset}`;
      const firstSeen = accountBalances[key]?.firstSeen || rb.timestamp;
      const newBalance = accountBalances[key]
        ? accountBalances[key].balance + rb.biAmount
        : rb.biAmount;
      accountBalances[key] = {
        account: rb.account,
        asset: rb.asset,
        balance: newBalance,
        timestamp: rb.timestamp,
        firstSeen: firstSeen,
      };
    }
  });
  // Sort account balances by first seen timestamp to ensure deterministic processing order
  accountBalances = Object.fromEntries(
    Object.entries(accountBalances).sort(
      (a, b) => a[1].firstSeen - b[1].firstSeen
    )
  );
  Object.values(accountBalances).forEach((ab) => {
    const calculatedBalance = undisposedLots.reduce((sum, lot) => {
      if (lot.account == ab.account && lot.asset == ab.asset) {
        return BigInt(sum) + BigInt(lot.remainingAmount);
      }
      return BigInt(sum);
    }, BigInt("0"));
    ab.lotBalance = calculatedBalance;
  });
  const lotsByAsset = {};
  undisposedLots.forEach((lot) => {
    if (!lotsByAsset[lot.asset]) {
      lotsByAsset[lot.asset] = [];
    }
    lotsByAsset[lot.asset].push(lot);
  });

  const newLots = [];

  Object.keys(lotsByAsset).forEach((asset) => {
    const lots = lotsByAsset[asset];
    const accountsNeedingAsset = Object.values(accountBalances).filter(
      (ab) => ab.asset === asset && ab.balance > ab.lotBalance
    );
    const accountsWithExcessLots = Object.values(accountBalances).filter(
      (ab) => ab.asset === asset && ab.balance < ab.lotBalance
    );

    accountsNeedingAsset.forEach((accountNeedingLots) => {
      let remainingNeeded =
        accountNeedingLots.balance - accountNeedingLots.lotBalance;

      // Only iterate through lots from accounts that have excess
      for (const lot of lots) {
        if (remainingNeeded <= BigInt("0")) {
          break;
        }
        if (lot.remainingAmount <= BigInt("0")) {
          continue;
        }
        // Only take lots from accounts with excess lots
        const lotSourceAccount = accountsWithExcessLots.find(
          (ab) =>
            ab.account === lot.account &&
            ab.asset === lot.asset &&
            ab.balance < ab.lotBalance
        );
        if (!lotSourceAccount) {
          continue;
        }
        const remainingExcess =
          lotSourceAccount.lotBalance - lotSourceAccount.balance;
        let transferAmount =
          lot.remainingAmount <= remainingNeeded
            ? lot.remainingAmount
            : remainingNeeded;
        transferAmount =
          transferAmount <= remainingExcess ? transferAmount : remainingExcess;
        lotSourceAccount.lotBalance =
          lotSourceAccount.lotBalance - transferAmount;
        let costBasisPortion =
          (lot.costBasis / parseFloat(formatEther(lot.amount))) *
          parseFloat(formatEther(transferAmount));
        if (currencyRounded(lot.costBasis - costBasisPortion) < 0.0) {
          //Handle rare case where costBasis are negative due to rounding
          costBasisPortion = lot.costBasis;
        }
        costBasisPortion = currencyRounded(costBasisPortion);
        newLots.push({
          buyTxId: lot.id,
          buyTxType: lot.type,
          buyPrice: lot.price,
          price: lot.price,
          transferTimestamp: cutoffTimestamp,
          timestamp: lot.timestamp, // Use original lot timestamp for accurate cost basis
          account: accountNeedingLots.account,
          asset: asset,
          amount: transferAmount,
          remainingAmount: transferAmount,
          costBasis: costBasisPortion,
          remainingCostBasis: costBasisPortion,
          taxTxType: "BUY-TRANSFER",
          sort: 0,
          id: `virtual-transfer-${lot.id}-${accountNeedingLots.account}`,
          type: "VIRTUAL-TRANSFER",
        });

        lot.remainingAmount = lot.remainingAmount - transferAmount;
        lot.remainingCostBasis = currencyRounded(
          lot.remainingCostBasis - costBasisPortion
        );

        remainingNeeded = remainingNeeded - transferAmount;
      }

      if (remainingNeeded > BigInt("0")) {
        console.warn(
          `Insufficient lots to fulfill ${accountNeedingLots.account}:${asset}. ` +
            `Needed: ${formatEther(remainingNeeded)}`
        );
      }
    });
  });

  return newLots;
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
