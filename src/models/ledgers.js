import { useAppStore } from "src/stores/app-store";
import {
  getKeyFields,
  getRequiredFields,
  getUpperCaseFields,
} from "src/utils/model-helpers";
import { currency } from "src/utils/number-helpers";
import moment from "moment";

const fields = [
  {
    name: "date",
    label: "Ledger Date",
    key: 1,
    defaultValue: () => moment().format("YYYY-MM-DD"),
  },
  {
    name: "time",
    label: "Time",
    key: 2,
    required: true,
    defaultValue: "00:00:00",
  },
  {
    name: "id",
    required: false,
    showColumn: true,
    label: "Id",
    format: (v) => v.substring(0, 10),
  },
  {
    name: "ledgerId",
    required: false,
    label: "Ledger Id",
    showColumn: false,
  },
  { name: "account", key: 4 },
  { name: "asset", key: 6 },
  { name: "action", key: 3, upperCase: true },
  {
    name: "amount",
    align: "right",
    format: (v) => parseFloat(v ?? 0.0).toFixed(4),
    key: 7,
  },
  { name: "memo", required: false, showColumn: false, key: 8 },
  {
    name: "price",
    align: "right",
    key: 7,
    format: (val, row) =>
      row.currency == "USD"
        ? currency(val)
        : `${parseFloat(val ?? 0.0).toFixed(4)}`,
  },
  {
    name: "currency",
    label: "Cur",
    key: 4,
    upperCase: true,
    defaultValue: (app) => app.defaultCurrency,
  },
  {
    name: "fee",
    align: "right",
    defaultValue: 0.0,
    format: (val, row) =>
      row.feeCurrency == "USD"
        ? currency(val)
        : `${parseFloat(val ?? 0.0).toFixed(4)}`,
  },
  {
    name: "feeCurrency",
    label: "FCur",
    upperCase: true,
    defaultValue: "USD",
  },
];

const splitFields = [
  { name: "date", label: "Ledger Date", key: 1 },
  {
    name: "time",
    label: "Time",
    key: 2,
    required: false,
  },
  { name: "displayId", required: false },
  { name: "account", key: 4 },
  { name: "asset", key: 6 },
  { name: "action", key: 3, upperCase: true },
  {
    name: "amount",
    align: "right",
    format: (v) => parseFloat(v ?? 0.0).toFixed(4),
    key: 7,
  },
  { name: "memo", required: false, showColumn: false, key: 8 },
  {
    name: "price",
    align: "right",
    format: currency,
    key: 7,
  },
  { name: "currency", label: "Source Cur" },
  {
    name: "gross",
    align: "right",
    format: currency,
  },
  {
    name: "fee",
    align: "right",
    format: (val, row) =>
      row.feeCurrency == "USD"
        ? currency(val)
        : `${parseFloat(val ?? 0.0).toFixed(4)}`,
  },
  {
    required: false,
    name: "net",
    align: "right",
    format: currency,
  },
];

const keyFields = getKeyFields(fields);
const requiredFields = getRequiredFields(fields);
const upperCaseFields = getUpperCaseFields(fields);

export { fields, splitFields, keyFields, requiredFields, upperCaseFields };
