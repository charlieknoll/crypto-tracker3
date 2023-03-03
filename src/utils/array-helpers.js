import { hasValue } from "./model-helpers";

const onlyUnique = function (value, index, self) {
  return self.indexOf(value) === index;
};
const sortByTimeStampThenId = (a, b) => {
  return a.timestamp == b.timestamp
    ? a.id > b.id
      ? 1
      : -1
    : a.timestamp - b.timestamp;
};
const stringToArray = function (val, delimter) {
  let result = [];
  if (!hasValue(val)) return result;

  result = val.replaceAll(" ", "").split(delimter);
  if (result.length == 1 && trackedTokens[0] == "") {
    result = [];
  }
  return result;
};
const convertToCsvNoHeadher = function (arr, names, delimiter) {
  if (!delimiter) delimiter = ",";
  const content = arr
    .map((val) => names.map((name) => val[name]).join(delimiter))
    .join("\r\n");
  return content;
};
export {
  onlyUnique,
  sortByTimeStampThenId,
  stringToArray,
  convertToCsvNoHeadher,
};
