import { formatUnits, parseUnits, parseEther, formatEther } from "ethers";

const convertToWei = function (val, decimals) {
  //creates an ether  representation of a bigint, e.g. $1000.123456 USDC (6 dec) would have a val passed in of 1000123456/n

  const decimalNum = formatUnits(
    BigInt(val ?? "0"),
    parseInt(decimals ?? 0) ?? 18
  );
  return parseEther(decimalNum);
};
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// const currency = (val) =>
//   `${val || val == 0.0 ? `$${parseFloat(val).toFixed(2)}` : ""}`;
const currency = (val) =>
  `${val || val == 0.0 ? usdFormatter.format(val) : ""}`;

const parseCommaFloat = (str) => {
  const cleaned = String(str).replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};
const currencyRounded = (val) => Math.round(val * 100) / 100;

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
const floatToWei = function (val) {
  if (val == undefined) return;
  let result = val.toString();
  if (result?.includes("e")) {
    return BigInt(Math.round((val ?? 0) * 1e18).toString());
  }
  const [whole, frac] = result.split(".");
  if (!frac) return parseEther(result);
  //round frc
  result = whole + "." + frac.slice(0, 18);

  return parseEther(result);
};
const floatToStr = function (val) {
  if (val == undefined) return;
  return formatEther(floatToWei(val));
};
const floatToStrAbs = function (val) {
  if (val == undefined) return;
  let result = formatEther(floatToWei(val));
  if (result[0] == "-") result = result.slice(1);
  return result;
};
export {
  currency,
  multiplyCurrency,
  sBnToFloat,
  perCent,
  convertToWei,
  parseCommaFloat,
  currencyRounded,
  floatToWei,
  floatToStr,
  floatToStrAbs,
};
