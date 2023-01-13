import { getKeyFields, getRequiredFields } from "src/utils/model-helpers";

const fields = [
  { name: "id", required: false, showColumn: false },
  { name: "name", required: true, showColumn: true },
  { name: "type", required: false, showColumn: true },
  { name: "address", required: true, showColumn: true, key: 2 },
  {
    name: "chain",
    required: true,
    showColumn: true,
    defaultValue: "ETH",
    key: 1,
  },
  {
    name: "skipInternal",
    required: false,
  },
  {
    name: "lastBlockSync",
    label: "Last Block",
    showColumn: true,
    defaultValue: 0,
  },
];

const keyFields = getKeyFields(fields);
const requiredFields = getRequiredFields(fields);

export { fields, keyFields, requiredFields };
