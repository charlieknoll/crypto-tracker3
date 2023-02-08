const getTaxCode = function (fromType, toType, toName, tokenTxCt) {
  if (!fromType) fromType = "";
  if (!toType) toType = "";
  let token = toName?.split(":")[1];
  if (token && tokenTxCt == 0 && toType == "Token") {
    return "TF:" + token;
  }
  if (token && tokenTxCt > 0) {
    return "";
  }
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
  let toType = tokenTx.toAccount?.type ?? "";
  let isMinted = tokenTx.fromAccount?.address.includes("0x00000000000");
  let isBurned = tokenTx.toAccount?.address.includes("0x00000000000");
  // if (toType == "") toType = tokenTx.parentTx?.toAccount?.type ?? "";

  let fromType = tokenTx.fromAccount?.type ?? "";
  // if (fromType == "") fromType = tokenTx.parentTx?.fromAccount?.type ?? "";

  let result = getTaxCode(fromType, toType);
  if (result != "") return result;
  if (toType == "Token") return "SELL";
  const parentToType = tokenTx.parentTx?.toAccount?.type;
  if (isMinted && parentToType == "Income") return "INCOME";
  if (isMinted && parentToType == "Token") return "BUY";
  if (isBurned && parentToType == "Token") return "SELL";
  if (fromType == "Token") return "BUY";
  return result;
};
export { getTaxCode, getTokenTaxCode };
