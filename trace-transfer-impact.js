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

console.log("Step 3: Transfer fee ($10) tries to distribute to Account-B lots");
console.log("  ⚠️ NO lots found in Account-B");
console.log("  Fee distribution FAILS - no cost basis added\n");

console.log("Step 4: Sell 0.5 ETH from Account-B");
console.log("  ⚠️ findPortfolioLot() searches across ALL accounts");
console.log("  Finds lot in Account-A (0.5 of 1.0 ETH)");
console.log("  Cost basis portion: $2000 * (0.5/1.0) = $1000");
console.log("  Proceeds: $1050");
console.log("  Gain/Loss: $1050 - $1000 = $50 gain");
console.log("  Remaining in Account-A: 0.5 ETH @ $1000 cost basis\n");

console.log("TOTAL CAPITAL GAINS: $50.00\n");

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

console.log("1. Transfer Fee Impact:");
console.log("   - WITHOUT transfers: Fee not applied (no lots in Account-B)");
console.log(
  "   - WITH transfers: Fee adds $10 to cost basis of transferred lot"
);
console.log("   - Difference: $10 lower gains WITH transfers\n");

console.log("2. Lot Splitting:");
console.log("   - WITHOUT transfers: Single 1.0 ETH lot remains whole");
console.log("   - WITH transfers: Lot split into 0.5 ETH pieces");
console.log("   - Impact: Rounding differences can accumulate\n");

console.log("3. FIFO Selection:");
console.log("   - WITHOUT transfers: findPortfolioLot() finds across accounts");
console.log("   - WITH transfers: Proper account-specific lot exists");
console.log("   - Impact: Can change which lot is selected for sells\n");

console.log("4. SELL-TRANSFER in Results:");
console.log("   - Created: 1 SELL-TRANSFER lot (costBasis=$1000, proceeds=$0)");
console.log(
  "   - If 'Sells Only' toggle is OFF, this appears in capital gains"
);
console.log("   - Adds cost basis with no proceeds (zero-sum for transfers)\n");

console.log("CAPITAL GAINS DIFFERENCE: $50 - $40 = $10");
console.log("This matches the transfer fee that was properly applied!\n");

console.log("=== HOW TO VERIFY IN YOUR APP ===\n");
console.log(
  "1. Toggle transfers ON/OFF by commenting line in cost-basis-store.js:"
);
console.log("   //mappedData = mappedData.concat(transferTxs);");
console.log("2. Check 'unreconciledAccounts' banner - will show mismatches");
console.log("3. Turn OFF 'Sells Only' to see SELL-TRANSFER lots");
console.log("4. Compare totals - difference = sum of all transfer fees\n");
