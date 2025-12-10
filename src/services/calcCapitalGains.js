function calculateCapitalGains(transactions) {
  //order transactions by date
  transactions.sort((a, b) => a.date - b.date);
  //calculate cost basis and quantity
  const { costBasis, quantity } = calculateCostBasisAndQuantity(transactions);

  return transactions.reduce(
    (acc, transaction) => {
      const { type, price, quantity, fee } = transaction;
      if (type === "buy") {
        acc.costBasis += price * quantity + fee;
        acc.quantity += quantity;
      } else {
        acc.costBasis -= price * quantity;
        acc.quantity -= quantity;
      }
      return acc;
    },
    { costBasis: 0, quantity: 0 }
  );
}
