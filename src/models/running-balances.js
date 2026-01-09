import { date } from "quasar";
import { formatEther, formatUnits } from "ethers";
import { currency } from "src/utils/number-helpers";
const runningAccountBalanceColumn = {
  name: "runningAccountBalance",
  label: "Current Account Balance",
  field: "biRunningAccountBalance",
  align: "right",
  format: (val, row) => `${formatEther(val ?? 0.0)}`,
  // format: (val, row) => `${parseFloat(val ?? 0.0).toFixed(12)}`,
  //style: (row) => "color: red;",
  style: (row) => {
    return `color: ${row.status};`;
  },
};
const runningBalanceColumn = {
  name: "runningBalance",
  label: "Current Asset Balance",
  field: "biRunningBalance",
  align: "right",
  format: (val, row) => `${formatEther(val ?? 0.0)}`,
};

const columns = [
  {
    name: "date",
    label: "Date",
    field: "date",
    align: "left",
    // format: (val, row) => {
    //   Object.assign(row, timestampToDateAndTime(row.timestamp));
    //   return row.date;
    // },
  },
  {
    label: "Time",
    name: "time",
    field: "time",
    align: "left",
    format: (val, row) => date.formatDate(row.timestamp * 1000, "HH:mm:ss"),
  },
  // {
  //   name: "timestamp",
  //   label: "Timestamp",
  //   field: "timestamp",
  //   align: "left",
  // },
  {
    name: "txId",
    label: "Id",
    field: "txId",
    align: "left",
    format: (v) => v.substring(0, 13),
  },
  {
    name: "account",
    label: "Account",
    field: "account",
    align: "left",
  },
  {
    name: "asset",
    label: "Asset",
    field: "asset",
    align: "left",
  },
  {
    name: "type",
    label: "Type",
    field: "type",
    align: "left",
  },
  {
    name: "action",
    label: "Action",
    field: "action",
    align: "left",
  },
  {
    name: "amount",
    label: "Amount",
    field: "amount",
    align: "right",
    format: (val, row) => `${parseFloat(val ?? 0.0).toFixed(4)}`,
  },
  {
    name: "price",
    label: "Price",
    field: "price",
    align: "right",
    format: (val, row) => `$${val ? parseFloat(val).toFixed(2) : "0.00"}`,
  },
  runningAccountBalanceColumn,
  runningBalanceColumn,
];

const summaryColumns = [
  {
    name: "date",
    label: "Last Used",
    field: "date",
    align: "left",
    // format: (val, row) => {
    //   Object.assign(row, timestampToDateAndTime(row.timestamp));
    //   return row.date;
    // },
  },
  {
    name: "account",
    label: "Account",
    field: "account",
    align: "left",
  },
  {
    name: "asset",
    label: "Asset",
    field: "asset",
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
    name: "currentPrice",
    label: "Current Price",
    field: "currentPrice",
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
];
const totalColumns = summaryColumns.concat([runningBalanceColumn]);
const accountTotalColumns = summaryColumns.concat([
  runningAccountBalanceColumn,
]);
export { columns, accountTotalColumns, totalColumns };
