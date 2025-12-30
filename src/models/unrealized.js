import { currency, perCent } from "src/utils/number-helpers";

const columns = [
  {
    name: "date",
    label: "Date",
    field: "date",
    align: "left",
  },
  {
    name: "time",
    label: "Time",
    field: "time",
    align: "left",
  },
  {
    name: "type",
    label: "Type",
    field: "taxCode",
    align: "left",
  },

  {
    name: "fromAccountName",
    label: "From",
    field: "fromAccountName",
    align: "left",
  },
  {
    name: "toAccountName",
    label: "To",
    field: "toAccountName",
    align: "left",
  },
  {
    name: "asset",
    label: "Asset",
    field: "asset",
    align: "left",
  },
  {
    name: "unrealizedAmount",
    label: "Amount",
    field: "unrealizedAmount",
    align: "left",
  },
  {
    name: "price",
    label: "Price",
    field: "price",
    align: "right",
    format: (val, row) => currency(val),
  },
  {
    name: "costBasis",
    label: "Cost",
    field: "costBasis",
    align: "right",
    format: (val, row) => currency(val),
  },
];
const assetTotalColumns = [
  {
    name: "asset",
    label: "Asset",
    field: "asset",
    align: "left",
  },
  {
    name: "unrealizedAmount",
    label: "Amount",
    field: "unrealizedAmount",
    align: "left",
  },
  {
    name: "price",
    label: "Current Price",
    field: "price",
    align: "right",
    format: (val, row) => currency(val),
  },
  {
    name: "costBasis",
    label: "Cost",
    field: "costBasis",
    align: "right",
    format: (val, row) => currency(val),
  },
  {
    name: "currentValue",
    label: "Current Value",
    field: "currentValue",
    align: "right",
    format: (val, row) => currency(val),
  },
  {
    name: "gain",
    label: "Unrealized Gain",
    field: "gain",
    align: "right",
    format: (val, row) => currency(val),
  },
  {
    name: "percentGain",
    label: "% Gain",
    field: "percentGain",
    align: "right",
    format: (val, row) => perCent(val),
  },
];
export { columns, assetTotalColumns };
