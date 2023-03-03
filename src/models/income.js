import { currency } from "src/utils/number-helpers";

export const columns = [
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
    name: "amount",
    label: "Amount",
    field: "amount",
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
    name: "gross",
    label: "Income",
    field: "gross",
    align: "right",
    format: (val, row) => currency(val),
  },
];
