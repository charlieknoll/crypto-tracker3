import { formatEther } from "ethers";
import { date } from "quasar";
import { timestampToDateStr } from "src/utils/date-helper";
import { currency, floatToStr } from "src/utils/number-helpers";
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
    format: (val, row) => {
      return val ?? row.timestamp
        ? date.formatDate(row.timestamp * 1000, "HH:mm:ss")
        : "";
    },
  },
  {
    name: "buyTimestamp",
    label: "Date Acquired",
    field: "buyTimestamp",
    format: (val) => timestampToDateStr(val),
  },
  {
    name: "account",
    label: "Account",
    field: "account",
    align: "left",
  },
  {
    name: "id",
    label: "Id",
    field: "id",
    align: "left",
    format: (v) => (v ?? "").substring(0, 13),
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
    name: "amount",
    label: "Amount",
    field: "amount",
    align: "right",
    format: (val, row) => (val ? formatEther(val) : ""),
  },
  {
    name: "costBasis",
    label: "Cost Basis",
    field: "costBasis",
    align: "right",
    format: currency,
  },
  {
    name: "proceeds",
    label: "Proceeds",
    field: "proceeds",
    align: "right",
    format: currency,
  },

  {
    name: "gainLoss",
    label: "GainLoss",
    field: "gainLoss",
    align: "right",
    format: currency,
  },

  {
    name: "daysHeld",
    label: "Days Held",
    field: "daysHeld",
    align: "right",
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
    name: "amount",
    label: "Amount",
    field: "amount",
    align: "right",
    format: (val, row) => (val ? formatEther(val) : ""),
  },
  {
    name: "costBasis",
    label: "Cost Basis",
    field: "costBasis",
    align: "right",
    format: currency,
  },
  {
    name: "proceeds",
    label: "Proceeds",
    field: "proceeds",
    align: "right",
    format: currency,
  },

  {
    name: "shortTermGain",
    label: "Short Term Gain",
    field: "shortTermGain",
    align: "right",
    format: currency,
  },
  {
    name: "longTermGain",
    label: "Long Term Gain",
    field: "longTermGain",
    align: "right",
    format: currency,
  },
];

export { columns, assetTotalColumns };
