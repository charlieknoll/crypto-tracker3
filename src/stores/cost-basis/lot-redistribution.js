import { formatEther } from "ethers/utils";

export function redistributeLotsToAccounts(
  undisposedLots,
  runningBalances,
  cutoffDate = "2025-01-01"
) {
  const cutoffTimestamp = new Date(cutoffDate).getTime() / 1000;

  const targetBalances = {};
  runningBalances.forEach((rb) => {
    if (rb.timestamp <= cutoffTimestamp) {
      const key = `${rb.account}:${rb.asset}`;
      targetBalances[key] = {
        account: rb.account,
        asset: rb.asset,
        balance: rb.biRunningAccountBalance,
        timestamp: rb.timestamp,
      };
    }
  });

  const finalBalances = {};
  Object.values(targetBalances).forEach((tb) => {
    const key = `${tb.account}:${tb.asset}`;
    if (!finalBalances[key] || finalBalances[key].timestamp < tb.timestamp) {
      finalBalances[key] = tb;
    }
  });

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

    const accountsNeedingAsset = Object.values(finalBalances)
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
