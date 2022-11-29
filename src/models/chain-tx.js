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
  { name: "id", format: (v) => v.substring(0, 10) },
  { name: "from" },
  { name: "to" },
  { name: "method" },
  { name: "taxCode", label: "Tax Code" },
  {
    name: "amount",
    format: (val, row) => `${(parseFloat(val) ?? 0.0).toFixed(4)}`,
  },
  { name: "price", format: (val, row) => currency(val) + " " + row.asset },
  { name: "fee", format: (val, row) => currency },
  { name: "gross", format: (val, row) => currency },
];

export { fields };
