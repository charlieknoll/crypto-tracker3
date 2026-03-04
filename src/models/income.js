import { format } from "quasar";
import { currency } from "src/utils/number-helpers";

export const totalColumns = [
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
    name: "net",
    label: "Income",
    field: "net",
    align: "right",
    format: (val, row) => currency(val),
  },
];
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
    format: (val, row) => row.toAccountName ?? row.account,
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
