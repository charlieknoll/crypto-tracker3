import { date } from "quasar";

const daysDifference = function (ts1, ts2) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  const date1 = new Date(ts1 * 1000);
  const date2 = new Date(ts2 * 1000);

  return Math.floor(
    Math.abs(date2.setHours(0, 0, 0, 0) - date1.setHours(0, 0, 0, 0)) /
      _MS_PER_DAY
  );
};
const timestampToDateStr = function (ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return date.formatDate(d, "YYYY-MM-DD");
};
const timestampToTime = function (ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return date.formatDate(d, "HH:mm:ss");
};
const timestampToDateAndTime = function (ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return {
    date: date.formatDate(d, "YYYY-MM-DD"),
    time: date.formatDate(d, "HH:mm:ss"),
  };
};
export {
  timestampToDateStr,
  timestampToDateAndTime,
  timestampToTime,
  daysDifference,
};
