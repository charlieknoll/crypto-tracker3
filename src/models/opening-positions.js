import { getKeyFields, getRequiredFields } from "src/utils/model-helpers";
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
  { name: "date", label: "Acquisition Date", key: 1 },
  { name: "id", required: false },
  { name: "account", key: true },
  { name: "asset", key: 2 },
  { name: "amount", align: "right", key: 4 },
  { name: "memo", required: false, showColumn: false, key: 5 },
  {
    name: "price",
    align: "right",
    format: currency,
    key: 3,
  },
  {
    name: "fee",
    align: "right",
    format: currency,
  },
  {
    name: "cost",
    align: "right",
    format: currency,
  },
];

const keyFields = getKeyFields(fields);
const requiredFields = getRequiredFields(fields);

export { fields, keyFields, requiredFields };
