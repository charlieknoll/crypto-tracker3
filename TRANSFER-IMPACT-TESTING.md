# Transfer Impact Testing Guide

## How to Test Transfer Impact in Your Application

### Quick Test: Enable/Disable Transfers

**Location:** `src/stores/cost-basis-store.js` line ~82

```javascript
// TO DISABLE TRANSFERS (to see the difference):
// Comment out this line:
//mappedData = mappedData.concat(transferTxs);

// TO ENABLE TRANSFERS:
// Uncomment this line:
mappedData = mappedData.concat(transferTxs);
```

### What to Look For

#### 1. **Console Summary (automatically logged)**

When you load the Capital Gains page, check the browser console for:

```
=== TRANSFER IMPACT SUMMARY ===
Total SELL lots: 1234
Total SELL-TRANSFER lots: 56
Total capital gains: $12,345.67
Transfer cost basis (hidden when 'Sells Only' ON): $5,678.90
Transfer txs included: 56
=== END SUMMARY ===
```

#### 2. **Unreconciled Accounts Banner**

- **With transfers:** Should show 0 unreconciled accounts (if your data is correct)
- **Without transfers:** Will show many unreconciled accounts because inventory tracking breaks

#### 3. **Capital Gains Total**

Run both configurations and compare:

| Configuration     | Capital Gains | Notes                                      |
| ----------------- | ------------- | ------------------------------------------ |
| WITH transfers    | Lower amount  | Correct - includes transfer fee cost basis |
| WITHOUT transfers | Higher amount | Incorrect - missing fee adjustments        |

The difference = sum of all transfer fees that were properly added to cost basis.

#### 4. **"Sells Only" Toggle**

On the Capital Gains page:

- **Toggle ON** (default): Shows only real SELL transactions
  - Transfer lots with `taxTxType: "SELL-TRANSFER"` are hidden
- **Toggle OFF**: Shows ALL sold lots including transfers
  - SELL-TRANSFER lots appear with:
    - `costBasis`: Value from original lot
    - `proceeds`: $0.00
    - `gainLoss`: $0.00
  - These are informational and don't affect tax reporting

### Example Test Sequence

1. **Start with transfers enabled** (default)

   ```javascript
   mappedData = mappedData.concat(transferTxs);
   ```

   - Open Capital Gains page
   - Note the total gains (bottom of page or Asset Totals)
   - Check console for "TRANSFER IMPACT SUMMARY"
   - Count of unreconciled accounts should be 0 or very low

2. **Disable transfers**

   ```javascript
   //mappedData = mappedData.concat(transferTxs);
   ```

   - Refresh the page
   - Note the NEW total gains
   - Calculate difference: `gains_without - gains_with`
   - Check unreconciled accounts banner (will be red)

3. **Expected Results**
   - Gains WITHOUT transfers will be higher
   - Difference ≈ sum of all transfer fees
   - Unreconciled accounts WITHOUT transfers will be > 0

### Real Example from Your Data

Based on the trace output, here's what happens with a simple transfer:

```
Initial: Buy 1.0 ETH @ $2000 in Account-A
Transfer: Send 0.5 ETH to Account-B (fee: $10)
Sell: 0.5 ETH from Account-B @ $2100

WITHOUT TRANSFERS:
  Sell matches against Account-A lot (findPortfolioLot searches all accounts)
  Cost basis: $1000 (half of $2000)
  Proceeds: $1050
  Gain: $50 ← WRONG! Missing the $10 fee

WITH TRANSFERS:
  Sell matches against Account-B lot (properly transferred)
  Cost basis: $1010 (half of $2000 + transfer fee $10)
  Proceeds: $1050
  Gain: $40 ← CORRECT!
```

### Debugging Specific Transfers

If you want to trace a specific transfer in detail:

1. Add to `src/stores/cost-basis/process-txs.js`:

   ```javascript
   import { traceTransfer } from "src/utils/transfer-tracer";

   if (tx.taxTxType === "TRANSFER") {
     // Add these lines in the TRANSFER processing block:
     if (tx.asset === "ETH") {
       // Filter for specific asset/account
       traceTransfer(tx, undisposedLots, soldLots, "BEFORE");
     }

     // ... existing transfer processing ...

     if (tx.asset === "ETH") {
       traceTransfer(tx, undisposedLots, soldLots, "AFTER");
     }
   }
   ```

2. Check console for detailed transfer logs showing:
   - Initial lot state
   - Lot splits
   - SELL-TRANSFER creation
   - BUY-TRANSFER creation
   - Cost basis changes

### Summary

**The difference in capital gains calculations comes from:**

1. **Transfer fees** being properly added to cost basis of receiving account lots
2. **Lot splits** during transfers (minor rounding differences)
3. **Account-specific FIFO** working correctly vs cross-account lot matching
4. **SELL-TRANSFER lots** appearing in results when "Sells Only" is OFF

**Recommendation:** ALWAYS include transfer transactions for accurate tax reporting!
