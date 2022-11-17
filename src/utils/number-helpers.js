const currency = (val, row) => `$${val ? parseFloat(val).toFixed(2) : "0.00"}`;
const multiplyCurrency = (args) => {
  let result = 1.0;
  for (let i = 0; i < args.length; i++) {
    const element = args[i];
    result = parseFloat(element) * result;
  }
  return Math.round(result * 100) / 100;
};
export { currency, multiplyCurrency };
