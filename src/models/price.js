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
  { name: "id", required: false, showColumn: false },
  { name: "asset", required: true, showColumn: true, upperCase: true, key: 1 },
  {
    name: "date",
    required: true,
    showColumn: true,
    key: 2,
    defaultValue: () => moment().format("YYYY-MM-DD"),
  },
  { name: "time", required: false, showColumn: true, key: 3 },
  {
    name: "price",
    required: true,
    showColumn: true,
    defaultValue: 0.0,
    format: currency,
  },
  // {
  //   name: "currency",
  //   key: 4,
  //   upperCase: true,
  //   defaultValue: app.defaultCurrency,
  // },
  { name: "source", required: true, showColumn: true, defaultValue: "Manual" },
];

const keyFields = getKeyFields(fields);
const requiredFields = getRequiredFields(fields);
const upperCaseFields = getUpperCaseFields(fields);
export { fields, keyFields, requiredFields, upperCaseFields };
