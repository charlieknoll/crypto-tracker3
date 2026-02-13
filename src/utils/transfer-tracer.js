/**
 * Transfer Tracer Utility
 *
 * Add this to processTxs() in process-txs.js to trace specific transfers:
 *
 * import { traceTransfer } from "src/utils/transfer-tracer";
 *
 * Then in the TRANSFER processing block:
 * if (tx.taxTxType === "TRANSFER") {
 *   traceTransfer(tx, undisposedLots, soldLots, "BEFORE");
 *   // ... existing transfer processing ...
 *   traceTransfer(tx, undisposedLots, soldLots, "AFTER");
 * }
 */

import { formatEther } from "ethers";

export function traceTransfer(tx, undisposedLots, soldLots, stage) {
  console.log(`\n=== TRANSFER TRACE [${stage}] ===`);
  console.log(`Timestamp: ${new Date(tx.timestamp * 1000).toISOString()}`);
  console.log(`From: ${tx.fromAccount} → To: ${tx.toAccount}`);
  console.log(`Asset: ${tx.asset}, Amount: ${formatEther(tx.amount)}`);
  console.log(`Fee: $${tx.fee}, ID: ${tx.id}`);

  // Show relevant lots BEFORE
  console.log(`\n--- Undisposed Lots (${tx.asset} only) ---`);
  const relevantLots = undisposedLots.filter((lot) => lot.asset === tx.asset);
  relevantLots.forEach((lot) => {
    console.log(
      `  ${lot.account}: ${formatEther(lot.remainingAmount)} ${
        lot.asset
      }, costBasis=$${lot.remainingCostBasis.toFixed(2)}, buyType=${lot.type}`
    );
  });

  if (stage === "AFTER") {
    console.log(`\n--- Sold Lots Created ---`);
    const newSoldLots = soldLots.filter((lot) => lot.id === tx.id);
    newSoldLots.forEach((lot) => {
      console.log(
        `  ${lot.taxTxType}: ${formatEther(lot.amount)} ${
          lot.asset
        }, costBasis=$${lot.costBasis.toFixed(
          2
        )}, proceeds=$${lot.proceeds.toFixed(2)}, gain=$${lot.gainLoss.toFixed(
          2
        )}`
      );
    });
  }

  console.log(`=== END TRACE ===\n`);
}

export function findTransferExamples(transferTxs, limit = 5) {
  console.log(`\n=== TRANSFER EXAMPLES ===`);
  console.log(`Total transfers found: ${transferTxs.length}\n`);

  const examples = transferTxs.slice(0, limit);
  examples.forEach((tx, idx) => {
    console.log(`${idx + 1}. ${new Date(tx.timestamp * 1000).toISOString()}`);
    console.log(`   ${tx.fromAccount} → ${tx.toAccount}`);
    console.log(`   ${formatEther(tx.amount)} ${tx.asset}, fee=$${tx.fee}`);
    console.log(`   ID: ${tx.id}\n`);
  });

  return examples;
}

export function traceCostBasisDifference(
  soldLotsWithTransfers,
  soldLotsWithoutTransfers
) {
  console.log(`\n=== CAPITAL GAINS COMPARISON ===\n`);

  const gainsWithTransfers = soldLotsWithTransfers
    .filter((lot) => lot.taxTxType === "SELL")
    .reduce((sum, lot) => sum + lot.gainLoss, 0.0);

  const gainsWithoutTransfers = soldLotsWithoutTransfers
    .filter((lot) => lot.taxTxType === "SELL")
    .reduce((sum, lot) => sum + lot.gainLoss, 0.0);

  const sellTransferLots = soldLotsWithTransfers.filter(
    (lot) => lot.taxTxType === "SELL-TRANSFER"
  );

  const totalTransferCostBasis = sellTransferLots.reduce(
    (sum, lot) => sum + lot.costBasis,
    0.0
  );

  console.log(`Gains WITH transfers:    $${gainsWithTransfers.toFixed(2)}`);
  console.log(`Gains WITHOUT transfers: $${gainsWithoutTransfers.toFixed(2)}`);
  console.log(
    `Difference:              $${(
      gainsWithTransfers - gainsWithoutTransfers
    ).toFixed(2)}`
  );
  console.log(`\nSELL-TRANSFER lots: ${sellTransferLots.length}`);
  console.log(
    `Total transfer cost basis: $${totalTransferCostBasis.toFixed(2)}`
  );
  console.log(
    `\nNote: If 'Sells Only' is OFF, SELL-TRANSFER lots add $${totalTransferCostBasis.toFixed(
      2
    )} cost basis with $0 proceeds`
  );

  return {
    gainsWithTransfers,
    gainsWithoutTransfers,
    difference: gainsWithTransfers - gainsWithoutTransfers,
    sellTransferCount: sellTransferLots.length,
    totalTransferCostBasis,
  };
}
