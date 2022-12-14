const getTaxCode = function (fromType, toType) {
  if (!fromType) fromType = "";
  if (!toType) toType = "";
  if (
    fromType.toLowerCase().includes("owned") &&
    toType.toLowerCase().includes("owned")
  )
    return "TRANSFER";
  if (fromType == "Income") return "INCOME";
  //TODO clarify this with "GIFT RECEIVED, GIFT GIVEN"
  if (toType == "Gift" || fromType == "Gift") return "GIFT";
  if (toType.includes("Donation")) return "DONATION";
  if (toType == "Spending") return "SPENDING";
  if (toType == "Expense") return "EXPENSE";
  return "";
};

const getTokenTaxCode = function (tokenTx) {
  let result = getTaxCode(tokenTx.fromAccount?.type, tokenTx.toAccount?.type);
  if (result != "") return result;
  const toType = tokenTx.toAccount?.type?.toLowerCase() ?? "";
  const fromType = tokenTx.fromAccount?.type?.toLowerCase() ?? "";
  if (toType == "token") return "SELL";
  if (fromType == "token") return "BUY";
  return result;
};
export { getTaxCode, getTokenTaxCode };
