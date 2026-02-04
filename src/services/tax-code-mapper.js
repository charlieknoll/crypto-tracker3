const getTaxCode = function (fromType, toType, toName, tokenTxCt, isError, tx) {
  if (isError) return "";

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

  if (fromType == "Spam") return "GIFT-IN";
  if (fromType == "Gift") return "TRANSFER";
  if (toType == "Gift") return "GIFT-OUT";
  if (toType.includes("Donation")) return "GIFT-OUT";
  if (toType == "Spending") return "SPENDING";
  if (toType == "Expense") return "EXPENSE";
  if (fromType == "Expense") return "EXPENSE REFUND";
  if (fromType == "Spending") return "SPENDING REFUND";

  return "";
};

const getTokenTaxCode = function (tokenTx) {
  let toType = tokenTx.toAccount?.type ?? "";
  // if (toType == "") toType = tokenTx.parentTx?.toAccount?.type ?? "";
  // if (
  //   tokenTx.hash ==
  //   "0x603e46ce4884ccfa774a6e422d36bbeb1dec2e82a6f83d6093413a017c529808"
  // )
  //   debugger;
  let fromType = tokenTx.fromAccount?.type ?? "";
  // if (fromType == "") fromType = tokenTx.parentTx?.fromAccount?.type ?? "";

  let result = getTaxCode(fromType, toType);
  if (result != "") return result;

  const parentToType = tokenTx.parentTx?.toAccount?.type;
  const outTokenTxsCt = tokenTx.parentTx?.outTokenTxs.length;
  const inTokenTxsCt = tokenTx.parentTx?.inTokenTxs.length;
  if (outTokenTxsCt == 0)
    return parentToType != "Token" ? parentToType?.toUpperCase() : "INCOME";
  if (inTokenTxsCt == 0)
    return parentToType != "Token" ? parentToType?.toUpperCase() : "SPENDING";
  // if (isMinted && parentToType == "Token") return "BUY";
  // if (isBurned && parentToType == "Token") return "SELL";
  if (fromType == "Token") return "BUY";
  if (toType == "Token") return "SELL";
  return "";
};
export { getTaxCode, getTokenTaxCode };
