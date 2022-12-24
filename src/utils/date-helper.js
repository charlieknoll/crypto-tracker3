import { date } from "quasar";

const timestampToDateStr = function (ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return date.formatDate(d, "YYYY-MM-DD");
};
const timestampToDateAndTime = function (ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return {
    date: date.formatDate(d, "YYYY-MM-DD"),
    time: date.formatDate(d, "HH:mm:ss"),
  };
};
export { timestampToDateStr, timestampToDateAndTime };
