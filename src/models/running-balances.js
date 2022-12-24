import { date } from "quasar";

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
    format: (v) => v.substring(0, 10),
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
  {
    name: "runningAccountBalance",
    label: "Running Acct Balance",
    field: "runningAccountBalance",
    align: "right",
    format: (val, row) => `${parseFloat(val ?? 0.0).toFixed(12)}`,
  },
  {
    name: "runningBalance",
    label: "Running Balance",
    field: "runningBalance",
    align: "right",
    format: (val, row) => `${parseFloat(val ?? 0.0).toFixed(12)}`,
  },
];

export { columns };
