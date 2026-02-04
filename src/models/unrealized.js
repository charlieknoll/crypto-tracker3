import { currency, perCent } from "src/utils/number-helpers";
import { date, format } from "quasar";
import { formatEther } from "ethers";
import { timestampToDateStr } from "src/utils/date-helper";

const columns = [
  {
    name: "date",
    label: "Aquisition Date",
    field: "date",
    align: "left",
  },
  {
    name: "time",
    label: "Time",
    field: "time",
    align: "left",
    format: (val, row) => {
      return val ?? row.timestamp
        ? date.formatDate(row.timestamp * 1000, "HH:mm:ss")
        : "";
    },
  },
  {
    name: "type",
    label: "Source",
    field: "type",
    align: "left",
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
    name: "id",
    label: "Id",
    field: "id",
    align: "left",
    format: (val, row) => val.substring(0, 10),
  },
  {
    name: "amount",
    label: "OriginalAmount",
    field: "amount",
    align: "right",
    format: (val, row) => `${formatEther(val)}`,
  },
  {
    name: "remainingAmount",
    label: "Amount",
    field: "remainingAmount",
    align: "right",
    format: (val, row) => `${formatEther(val)}`,
  },
  {
    name: "currentPrice",
    label: "Current Price",
    field: "currentPrice",
    align: "right",
    format: (val, row) => currency(val),
  },
  {
    name: "costBasis",
    label: "Cost",
    field: "remainingCostBasis",
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
    name: "gainLoss",
    label: "Gain/Loss",
    field: "gainLoss",
    align: "right",
    format: (val, row) => currency(val),
  },
  //daysHeld
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
    name: "unrealizedAmount",
    label: "Amount",
    field: "unrealizedAmount",
    align: "right",
    format: (val, row) => `${formatEther(val)}`,
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
    name: "shortGain",
    label: "Short Term Gain",
    field: "shortGain",
    align: "right",
    format: (val, row) => currency(val),
  },
  {
    name: "longGain",
    label: "Long Term Gain",
    field: "longGain",
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
