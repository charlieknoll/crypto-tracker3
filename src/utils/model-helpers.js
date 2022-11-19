import { ethers } from "ethers";

const hasValue = (v) => {
  if (v === 0) return true;

  return v && v?.toString().trim() != "";
};

const getInitValue = (fields, app) => {
  const result = {};
  fields.forEach((f) => {
    result[f.name] =
      typeof f.defaultValue === "function"
        ? f.defaultValue(app)
        : f.defaultValue;
  });
  return result;
};
const getId = (r, keyFields) => {
  let v = "";
  for (let i = 0; i < keyFields.length; i++) {
    const kf = keyFields[i];
    if (r[kf]) {
      v += r[kf].toString();
    }
  }

  return ethers.utils.id(v).substring(2, 12);
};
const getTimestamp = (d) => {
  return Math.round(new Date(d.substring(0, 19)).getTime() / 1000);
};
const getKeyFields = (fields) =>
  fields
    .filter((f) => f.key > 0)
    .sort((a, b) => {
      return a.key - b.key;
    })
    .map((f) => f.name);
const getRequiredFields = (fields) =>
  fields.filter((f) => f.required == undefined || f.required);
const validate = (r, requiredFields) => {
  let result = "";
  for (let i = 0; i < requiredFields.length; i++) {
    const rf = requiredFields[i];
    const test = r[rf.name];
    if (!hasValue(test))
      result +=
        rf.name[0].toUpperCase() + rf.name.substring(1) + " is required<br>";
  }
  return result;
};
const getUpperCaseFields = (fields) => fields.filter((f) => f.upperCase);
const setUpperCase = (r, upperCaseFields) => {
  for (let i = 0; i < upperCaseFields.length; i++) {
    const f = upperCaseFields[i];
    r[f.name] = r[f.name].toUpperCase();
  }
  return r;
};
export {
  hasValue,
  getInitValue,
  getId,
  getKeyFields,
  getRequiredFields,
  validate,
  getTimestamp,
  getUpperCaseFields,
  setUpperCase,
};
