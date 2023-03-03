import { ethers } from "ethers";
const BigNumber = ethers.BigNumber;

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
const sBnToFloat = function (v, decimals = 18) {
  const bn = BigNumber.from(v, decimals);
  try {
    return parseFloat(ethers.utils.formatUnits(bn, decimals));
  } catch (error) {
    //kill
    return 0.0;
  }
};
export { currency, multiplyCurrency, sBnToFloat };
