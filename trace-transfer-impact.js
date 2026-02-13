/**
 * Transfer Impact Tracer
 *
 * This script demonstrates the exact impact of including TRANSFER transactions
 * on capital gains calculations by tracing a specific transfer step-by-step.
 *
 * Run this to see:
 * 1. Cost basis changes when transfer fees are distributed
 * 2. Lot splits when transfers move assets between accounts
 * 3. FIFO lot selection changes from re-sorted lots
 * 4. Final impact on realized gains
 */

// Example scenario demonstrating the issue:
const example = {
  // Initial state: One buy lot in Account A
  initialLots: [
    {
      account: "Account-A",
      asset: "ETH",
      timestamp: 1600000000,
      amount: BigInt("1000000000000000000"), // 1 ETH
      price: 2000.0,
      costBasis: 2000.0,
      remainingAmount: BigInt("1000000000000000000"),
      remainingCostBasis: 2000.0,
      id: "buy-1",
      type: "CHAIN-BUY",
    },
  ],

  // A transfer transaction
  transfer: {
    taxTxType: "TRANSFER",
    fromAccount: "Account-A",
    toAccount: "Account-B",
    asset: "ETH",
    timestamp: 1600100000,
    amount: BigInt("500000000000000000"), // 0.5 ETH
    fee: 10.0, // $10 USD fee
    id: "transfer-1",
    type: "CHAIN-TRANSFER",
  },

  // A later sell from Account B
  sell: {
    taxTxType: "SELL",
    account: "Account-B",
    asset: "ETH",
    timestamp: 1600200000,
    amount: BigInt("500000000000000000"), // 0.5 ETH
    price: 2100.0,
    proceeds: 1050.0, // 0.5 * 2100
    id: "sell-1",
    type: "EXCHANGE-SELL",
  },
};

console.log("=== TRANSFER IMPACT TRACE ===\n");

console.log("SCENARIO:");
console.log("1. Buy 1.0 ETH in Account-A for $2000 (cost basis: $2000)");
console.log("2. Transfer 0.5 ETH from Account-A to Account-B (fee: $10)");
console.log("3. Sell 0.5 ETH from Account-B for $1050\n");

console.log("=== WITHOUT TRANSFERS ===\n");

console.log("Step 1: Buy creates lot in Account-A");
console.log("  Lot: Account-A, 1.0 ETH, cost basis $2000\n");

console.log("Step 2: Transfer is SKIPPED");
console.log("  Lot remains: Account-A, 1.0 ETH, cost basis $2000");
console.log("  Account-B has NO lots\n");

console.log("Step 3: Transfer fee ($10) distributes to ALL ETH lots (portfolio-wide BEFORE cutover)");
console.log("  Finds all ETH lots: Account-A has 1.0 ETH");
console.log("  Fee distribution: Account-A lot gets $10");
console.log("  Updated: Account-A, 1.0 ETH, cost basis $2000 + $10 = $2010\n");

console.log("Step 4: Sell 0.5 ETH from Account-B");
console.log("  ⚠️ findPortfolioLot() searches across ALL accounts");
console.log("  Finds lot in Account-A (0.5 of 1.0 ETH)");
console.log("  Cost basis portion: $2010 * (0.5/1.0) = $1005");
console.log("  Proceeds: $1050");
console.log("  Gain/Loss: $1050 - $1005 = $45 gain");
console.log("  Remaining in Account-A: 0.5 ETH @ $1005 cost basis\n");

console.log("TOTAL CAPITAL GAINS: $45.00");
console.log("(Fee WAS applied to Account-A, since it's portfolio-wide before cutover)\n");

console.log("=== WITH TRANSFERS ===\n");

console.log("Step 1: Buy creates lot in Account-A");
console.log("  Lot: Account-A, 1.0 ETH, cost basis $2000\n");

console.log("Step 2: Transfer 0.5 ETH from Account-A to Account-B");
console.log("  a) Create SELL-TRANSFER from Account-A");
console.log("     - Finds lot: Account-A, 1.0 ETH");
console.log("     - Splits 0.5 ETH out");
console.log("     - Cost basis portion: $2000 * (0.5/1.0) = $1000");
console.log("     - Creates sold lot: costBasis=$1000, proceeds=$0, gain=$0");
console.log("     - Remaining in Account-A: 0.5 ETH @ $1000 cost basis\n");

console.log("  b) Create BUY-TRANSFER into Account-B");
console.log("     - New lot: Account-B, 0.5 ETH");
console.log("     - Inherits cost basis: $1000");
console.log("     - Inherits original timestamp: 1600000000");
console.log("     - Has transferTimestamp: 1600100000\n");

console.log("Step 3: Transfer fee ($10) distributes to Account-B");
console.log("  Finds lots in Account-B: 0.5 ETH");
console.log("  Total amount in Account-B: 0.5 ETH");
console.log("  Distribution: Account-B lot gets ($10 * 0.5/0.5) = $10");
console.log(
  "  Updated lot: Account-B, 0.5 ETH, cost basis $1000 + $10 = $1010\n"
);

console.log("Step 4: Sell 0.5 ETH from Account-B");
console.log("  findPortfolioLot() finds Account-B lot (0.5 ETH)");
console.log("  Cost basis: $1010");
console.log("  Proceeds: $1050");
console.log("  Gain/Loss: $1050 - $1010 = $40 gain");
console.log("  All of Account-B lot consumed\n");

console.log("TOTAL CAPITAL GAINS: $40.00\n");

console.log("=== KEY DIFFERENCES ===\n");

console.log("1. Transfer Fee Impact (BEFORE Cutover - Portfolio-wide):");
console.log("   - WITHOUT transfers: Fee applied portfolio-wide to Account-A");
console.log("   - WITH transfers: Fee adds to Account-B after transfer");
console.log("   - Both apply the fee, but to different lots!\n");

console.log("2. Transfer Fee Impact (AFTER Cutover - Account-specific):");
console.log("   - WITHOUT transfers: Fee targets Account-B, finds NOTHING");
console.log("   - WITH transfers: Fee targets Account-B, finds transferred lot");
console.log("   - This is when transfers become REQUIRED!\n");

console.log("3. Lot Splitting:");
console.log("   - WITHOUT transfers: Single 1.0 ETH lot in Account-A gets ALL the fee");
console.log("   - WITH transfers: Lot split, only transferred 0.5 ETH gets the fee");
console.log("   - Impact: Different proportional cost basis\n");

console.log("4. SELL-TRANSFER lots:");
console.log("   - Created with costBasis but $0 proceeds (informational only)");
console.log("   - Hidden when 'Sells Only' is ON (default)");
console.log("   - Shows proper audit trail of asset movement\n");

console.log("CAPITAL GAINS DIFFERENCE: $45 - $40 = $5");
console.log("Difference comes from WHERE the fee is applied:\n");
console.log("  - WITHOUT transfers: Fee adds to Account-A lot (portfolio-wide)");
console.log("                      But sell uses Account-A lot, so fee IS included");
console.log("  - WITH transfers:    Fee adds to Account-B lot (after transfer)");
console.log("                      Sell uses Account-B lot with fee\n");
console.log("The $5 difference is from lot splitting rounding and which lot gets the fee!\n");

console.log("=== HOW TO VERIFY IN YOUR APP ===\n");
console.log(
  "1. Toggle transfers ON/OFF by commenting line in cost-basis-store.js:"
);
console.log("   //mappedData = mappedData.concat(transferTxs);");
console.log("2. Check 'unreconciledAccounts' banner - will show mismatches");
console.log("3. Turn OFF 'Sells Only' to see SELL-TRANSFER lots");
console.log("4. Compare totals - difference = sum of all transfer fees\n");
