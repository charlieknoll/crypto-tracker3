import { useAppStore } from "src/stores/app-store";
import { date } from "quasar";
import {
  getKeyFields,
  getRequiredFields,
  getUpperCaseFields,
} from "src/utils/model-helpers";
import { currency } from "src/utils/number-helpers";
import moment from "moment";
//const app = useAppStore();
const fields = [
  { name: "date" },
  {
    label: "Time",
    name: "time",
    field: "time",
    align: "left",
    format: (val, row) => date.formatDate(row.timestamp * 1000, "HH:mm:ss"),
  },
  { name: "id", format: (v) => v.substring(0, 8) },
  { name: "txType" },
  {
    name: "fromAccountName",
    label: "From",
    format: (val) => val.substring(0, 18),
  },
  { name: "toAccountName", label: "To", format: (val) => val.substring(0, 18) },
  { name: "methodName", label: "Method" },
  {
    name: "taxCode",
    label: "Tax Code",
    format: (val) => val?.substring(0, 18),
  },
  {
    name: "amount",
    align: "right",
    format: (val, row) => `${(parseFloat(val) ?? 0.0).toFixed(4)}`,
  },
  {
    name: "gasFee",
    label: "Gas",
    align: "right",
    format: (val, row) => `${val ? parseFloat(val).toFixed(6) : ""}`,
  },
  { name: "price", format: (val, row) => currency(val) },
  { name: "asset" },
  { name: "fee", format: currency, align: "right" },
  { name: "gross", format: (val, row) => currency(val), align: "right" },
  {
    name: "error",
    format: (val, row) => `${val == 1 ? "ERROR" : ""}`,
    style: "color: red; font-weight: bold;",
  },
];
const tokenFields = [
  { name: "date" },
  {
    name: "id",
    format: (v, row) => v.substring(0, 8) + (row.suffix ?? ""),
  },
  { name: "txType" },
  { name: "fromAccountName", label: "From" },
  { name: "toAccountName", label: "To" },
  { name: "methodName", label: "Method" },
  {
    name: "asset",
    label: "Token",
    format: (val, row) => (val == "ETH" ? "" : val),
  },
  { name: "taxCode", label: "Tax Code" },
  {
    name: "amount",
    align: "right",
    format: (val, row) => `${(parseFloat(val) ?? 0.0).toFixed(4)}`,
  },
  { name: "price", format: (val, row) => currency(val) },
  { name: "fee", format: currency, align: "right" },
  { name: "gross", format: (val, row) => currency(val), align: "right" },
];
export { fields, tokenFields };
