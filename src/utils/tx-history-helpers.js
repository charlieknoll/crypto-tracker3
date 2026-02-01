const getLotTrace = function (lot, heldLots) {
  const trace = [];
  let currentLot = lot;
  while (currentLot) {
    trace.push(currentLot);
    if (currentLot.buyTxId) {
      currentLot = heldLots.find((l) => l.id == currentLot.buyTxId);
    } else {
      currentLot = null;
    }
  }
  return trace;
};

export { getLotTrace };
