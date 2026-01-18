export const filterByAccounts = function (txs, selectedAccounts, useToFrom) {
  if (!selectedAccounts) return txs;
  if (selectedAccounts.length > 0) {
    if (useToFrom) {
      txs = txs.filter((tx) => {
        return (
          selectedAccounts.findIndex((a) => a == tx.toAccountName) > -1 ||
          selectedAccounts.findIndex((a) => a == tx.fromAccountName) > -1
        );
      });
    } else {
      txs = txs.filter((tx) => {
        return selectedAccounts.findIndex((a) => a == tx.account) > -1;
      });
    }
  }
  return txs;
};

export const filterByAssets = function (txs, selectedAssets) {
  if (!selectedAssets) return txs;
  if (selectedAssets.length > 0) {
    txs = txs.filter((tx) => {
      return selectedAssets.findIndex((ss) => ss == tx.asset) > -1;
    });
  }
  return txs;
};
export const filterByYear = function (txs, year) {
  txs =
    year == "All"
      ? txs
      : txs.filter((tx) => parseInt(tx.date.substring(0, 4)) == year);
  return txs;
};
export const filterUpToYear = function (txs, year) {
  txs =
    year == "All"
      ? txs
      : txs.filter((tx) => parseInt(tx.date.substring(0, 4)) <= year);
  return txs;
};
