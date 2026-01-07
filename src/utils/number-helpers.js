import { formatUnits, parseUnits } from "ethers";

const currency = (val, row) =>
  `${val || val == 0.0 ? `$${parseFloat(val).toFixed(2)}` : ""}`;
const multiplyCurrency = (args) => {
  let result = 1.0;
  for (let i = 0; i < args.length; i++) {
    const element = args[i];
    result = parseFloat(element) * result;
  }

  return Math.round(result * 100) / 100;
};
const perCent = (val) =>
  `${val || val == 0.0 ? `${parseFloat(val).toFixed(2)}%` : ""}`;

const sBnToFloat = function (v, decimals = 18) {
  try {
    //TODO '1000000000' returns 1e-9 which is too small for us, this hack returns 0.0 instead of exponential
    if (decimals - v.length > 5) return 0.0;
    return parseFloat(formatUnits(v, decimals));
  } catch (error) {
    //kill
    return 0.0;
  }
};
export { currency, multiplyCurrency, sBnToFloat, perCent };
