import { useAppStore } from "src/stores/app-store";

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
  { name: "id", format: (v) => v.substring(0, 8) },
  { name: "fromAccount", label: "From" },
  { name: "toAccount", label: "To" },
  { name: "methodName", label: "Method" },
  { name: "taxCode", label: "Tax Code" },
  {
    name: "amount",
    align: "right",
    format: (val, row) => `${(parseFloat(val) ?? 0.0).toFixed(4)}`,
  },
  {
    name: "gasFee",
    label: "Gas",
    align: "right",
    format: (val, row) => `${(parseFloat(val) ?? 0.0).toFixed(6)}`,
  },
  { name: "price", format: (val, row) => currency(val) + " " + row.asset },
  { name: "fee", format: currency, align: "right" },
  { name: "gross", format: (val, row) => currency(val), align: "right" },
  { name: "error" },
];

export { fields };
