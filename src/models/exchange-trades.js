//1406548800

import { useAppStore } from "src/stores/app-store";
import {
  getKeyFields,
  getRequiredFields,
  getUpperCaseFields,
} from "src/utils/model-helpers";
import { currency } from "src/utils/number-helpers";
import moment from "moment";
//order of fields will set order of columns
//name: used to generate column name and default header if "label" not provided
//name: id must be set as name for one field
//label: used for column header
//required: default true, used for record validation
//key: numeric, sets the order of the calculated key
//showColumn: default true, will show column if set
//format: used for column display
//align: default "left"
//console.log("exchange-trades fields");
const fields = [
  {
    name: "date",
    label: "Trade Date",
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
    name: "exchangeId",
    required: false,
    label: "Exchange Id",
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
  },
  {
    name: "feeCurrency",
    label: "FCur",
    upperCase: true,
    defaultValue: "USD",
  },
];
const splitFields = [
  { name: "date", label: "Trade Date", key: 1 },
  {
    name: "time",
    label: "Time",
    key: 2,
    required: false,
  },
  { name: "id", required: false, format: (v) => v.substring(0, 10) },

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
    format: currency,
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
