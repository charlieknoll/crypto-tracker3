import { date } from "quasar";
import { currency } from "src/utils/number-helpers";
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
    format: (val, row) =>
      val ? date.formatDate(row.timestamp * 1000, "HH:mm:ss") : "",
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
    format: (val, row) => (val ? `${parseFloat(val ?? 0.0).toFixed(4)}` : ""),
  },
  {
    name: "price",
    label: "Price",
    field: "price",
    align: "right",
    format: currency,
  },
  {
    name: "gross",
    label: "Gross",
    field: "gross",
    align: "right",
    format: currency,
  },
  {
    name: "fee",
    label: "Fee",
    field: "fee",
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
  {
    name: "longLots",
    label: "L Lots",
    field: "longLots",
    align: "right",
  },
  {
    name: "shortLots",
    label: "S Lots",
    field: "shortLots",
    align: "right",
  },
];

export { columns };
