import {
  getKeyFields,
  getRequiredFields,
  getUpperCaseFields,
} from "src/utils/model-helpers";
import { currency } from "src/utils/number-helpers";

//order of fields will set order of columns
//name: used to generate column name and default header if "label" not provided
//name: id must be set as name for one field
//label: used for column header
//required: default true, used for record validation
//key: numeric, sets the order of the calculated key
//showColumn: default true, will show column if set
//format: used for column display
//align: default "left"

const fields = [
  { name: "date", label: "Trade Date", key: 1 },
  { name: "id", required: false, showColumn: false },
  { name: "exchangeId", required: false, label: "Exchange Id" },
  { name: "account", key: 3 },
  { name: "asset", key: 5 },
  { name: "action", key: 2, upperCase: true },
  { name: "amount", align: "right", key: 7 },
  { name: "memo", required: false, showColumn: false, key: 6 },
  {
    name: "price",
    align: "right",
    format: currency,
    key: 6,
  },
  { name: "currency", key: 4, upperCase: true },
  {
    name: "fee",
    align: "right",
    format: currency,
  },
  { name: "feeCurrency", label: "Fee Currency", upperCase: true },
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
export { fields, keyFields, requiredFields, upperCaseFields };
