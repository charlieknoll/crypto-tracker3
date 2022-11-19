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
const app = useAppStore();

const fields = [
  {
    name: "date",
    label: "Transfer Date",
    key: 1,
    defaultValue: () => moment().format("YYYY-MM-DD"),
  },
  {
    name: "time",
    label: "Time",
    key: 2,
    required: false,
  },
  { name: "id", required: false, showColumn: false },
  { name: "transferId", required: false, label: "Transfer Id" },
  { name: "fromAccount", key: 5, label: "From Account" },
  { name: "toAccount", key: 4, label: "To Account" },
  { name: "asset", key: 3 },
  { name: "amount", align: "right", key: 6 },
  { name: "memo", required: false, showColumn: false, key: 7 },
  {
    name: "fee",
    align: "right",
    defaultValue: 0.0,
  },
  {
    name: "feeCurrency",
    label: "Fee Currency",
    upperCase: true,
    defaultValue: app.defaultCurrency,
  },
];

const keyFields = getKeyFields(fields);
const requiredFields = getRequiredFields(fields);
const upperCaseFields = getUpperCaseFields(fields);
export { fields, keyFields, requiredFields, upperCaseFields };
