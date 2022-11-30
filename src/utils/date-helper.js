const timestampToDateStr = function (ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toISOString().slice(0, 10);
};

export { timestampToDateStr };
