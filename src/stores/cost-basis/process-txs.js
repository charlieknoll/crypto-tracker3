import { formatEther } from "ethers";
import { verifyAssetBalance, checkPrice, handleError } from "./verification";
import {
  currencyRounded,
  multiplyCurrency,
  floatToWei,
  floatToStrAbs,
} from "../../utils/number-helpers";
import {
  sortByTimeStampThenIdThenSort,
  sortByTimeStampThenSort,
} from "src/utils/array-helpers";
import { daysDifference } from "src/utils/date-helper";

function findAccountLot(tx, undisposedLots) {
  //TODO handle wallet cutovers by resetting walletName on undisposedLots
  return undisposedLots.find(
    (lot) =>
      lot.asset == tx.asset &&
      lot.account == tx.account &&
      lot.remainingAmount > BigInt("0")
  );
}
function findPortfolioLot(tx, undisposedLots) {
  //TODO handle wallet cutovers by resetting walletName on undisposedLots
  return undisposedLots.find(
    (lot) =>
      lot.asset == tx.asset &&
      //lot.account == tx.account &&
      lot.remainingAmount > BigInt("0")
  );
}
export function processTxs(
  mappedData,
  runningBalances,
  cutoverTimestamp,
  undisposedLots = [],
  soldLots = []
) {
  let unreconciledAccounts = [];
  const noInventoryTxs = [];
  let sellCt = 0;
  let buyCt = 0;
  let transferCt = 0;
  let costBasisCt = 0;
  let timestamp = 0;
  let prevTx = null;

  mappedData.some((tx) => {
    if (tx.timestamp != timestamp && prevTx) {
      if (
        !verifyAssetBalance(prevTx, runningBalances, undisposedLots, soldLots)
      )
        return true;
    }
    timestamp = tx.timestamp;
    prevTx = Object.assign({}, tx);
    // console.log(
    //   `Undisposed: ${undisposedLots.length}, Sold: ${soldLots.length},BuyCt: ${buyCt}, SellCt: ${sellCt}, TransferCt: ${transferCt}, CostBasisCt: ${costBasisCt}`
    // );
    //TODO handle account/wallet cutover timestamp by resetting walletName on undisposedLots
    if (tx.taxTxType.substring(0, 3) === "BUY") {
      buyCt;
      undisposedLots.push(tx);
    }
    if (tx.taxTxType === "SELL") {
      sellCt++;
      let remainingAmount = tx.amount;
      let remainingProceeds = tx.proceeds;
      let lot = findPortfolioLot(tx, undisposedLots);
      while (remainingAmount > 0 && lot) {
        let lotAmount = lot.remainingAmount;
        if (lotAmount > remainingAmount) {
          lotAmount = remainingAmount;
        }
        let costBasisPortion =
          (lot.costBasis / parseFloat(formatEther(lot.amount))) *
          parseFloat(formatEther(lotAmount));
        costBasisPortion = currencyRounded(costBasisPortion);

        if (currencyRounded(lot.costBasis - costBasisPortion) < 0.0) {
          //Handle rare case where costBasis are negative due to rounding
          costBasisPortion = lot.costBasis;
        }
        let proceedsPortion =
          (tx.proceeds / parseFloat(formatEther(tx.amount))) *
          parseFloat(formatEther(lotAmount));

        if (currencyRounded(remainingProceeds - proceedsPortion) < 0.0) {
          //Handle rare case where proceeds are negative due to rounding
          proceedsPortion = remainingProceeds;
        }
        const soldLot = {
          account: tx.account,
          asset: tx.asset,
          buyTxId: lot.id,
          buyTxType: lot.type,
          buyTimestamp: lot.timestamp,
          buyPrice: lot.price,
          id: tx.id,
          type: tx.type,
          price: tx.price,
          timestamp: tx.timestamp,
          daysHeld: daysDifference(tx.timestamp, lot.timestamp),
          amount: lotAmount,
          costBasis: currencyRounded(costBasisPortion),
          proceeds: currencyRounded(proceedsPortion),
          gainLoss: currencyRounded(proceedsPortion - costBasisPortion),
          taxTxType: "SELL",
        };
        soldLots.push(soldLot);

        lot.remainingAmount -= lotAmount;
        lot.remainingCostBasis =
          lot.remainingAmount == BigInt("0")
            ? 0.0
            : currencyRounded(lot.remainingCostBasis - costBasisPortion);

        remainingAmount -= lotAmount;
        remainingProceeds =
          remainingAmount == BigInt("0")
            ? 0.0
            : currencyRounded(remainingProceeds - proceedsPortion);

        if (lot.remainingAmount < BigInt("0")) {
          debugger;
          throw new Error("Lot remaining amount negative");
        }
        if (lot.remainingCostBasis < 0.0) {
          //debugger;
          // throw new Error("Lot remaining cost basis negative");
          lot.remainingCostBasis = 0.0;
        }
        if (remainingAmount > BigInt("0")) {
          //find the next undisposed lot
          lot = findPortfolioLot(tx, undisposedLots);
        } else lot = null;
      }
      if (remainingAmount > BigInt("0")) {
        noInventoryTxs.push(tx);

        // throw new Error(
        //   `Cannot find enough inventory for ${tx.account}:${
        //     tx.asset
        //   }, amount remaining: ${formatEther(remainingAmount)}`
        // );
      }
    }
    if (tx.taxTxType === "COST-BASIS") {
      costBasisCt++;
      //Distribute cost basis fee:
      //  - Portfolio-wide by asset BEFORE cutover (old wallet behavior)
      //  - Account-specific by asset AFTER cutover (new wallet behavior)
      const relevantLots = undisposedLots.filter(
        (lot) =>
          lot.asset == tx.asset &&
          lot.remainingAmount > BigInt("0") &&
          (tx.timestamp <= cutoverTimestamp || lot.account == tx.account)
      );
      const totalAmount = relevantLots.reduce(
        (sum, lot) => sum + parseFloat(formatEther(lot.remainingAmount)),
        0.0
      );
      for (const lot of relevantLots) {
        const lotAmount = parseFloat(formatEther(lot.remainingAmount));
        const costBasisPortion = (lotAmount / totalAmount) * tx.fee;

        //TODO check this is working
        lot.costBasis += currencyRounded(costBasisPortion);
        lot.remainingCostBasis += currencyRounded(costBasisPortion);
      }
    }
    if (tx.taxTxType === "TRANSFER") {
      //return false;
      //first "mini-SELL" from fromAccount
      transferCt++;
      let remainingAmount = tx.amount;
      let lot = findAccountLot(
        {
          asset: tx.asset,
          account: tx.fromAccount,
        },
        undisposedLots
      );
      let costBasisPortion = 0.0;
      while (remainingAmount > 0 && lot) {
        let lotAmount = lot.remainingAmount;
        if (lotAmount > remainingAmount) {
          lotAmount = remainingAmount;
        }
        costBasisPortion =
          (lot.costBasis / parseFloat(formatEther(lot.amount))) *
          parseFloat(formatEther(lotAmount));

        if (currencyRounded(lot.costBasis - costBasisPortion) < 0.0) {
          //Handle rare case where costBasis are negative due to rounding
          costBasisPortion = lot.costBasis;
        }
        //create a sold lot with zero proceeds and cost basis to track the transfer
        const soldLot = {
          account: lot.account,
          asset: lot.asset,
          buyTxId: lot.id,
          buyTxType: lot.type,
          buyTimestamp: lot.timestamp,
          buyPrice: lot.price,
          id: tx.id,
          type: tx.type,
          timestamp: tx.timestamp,
          price: lot.price,
          amount: lotAmount,
          costBasis: currencyRounded(costBasisPortion),
          proceeds: 0.0,
          gainLoss: 0.0,
          taxTxType: "SELL-TRANSFER",
        };
        soldLots.push(soldLot);
        lot.remainingAmount -= lotAmount;
        lot.remainingCostBasis =
          lot.remainingAmount == BigInt("0")
            ? 0.0
            : currencyRounded(lot.remainingCostBasis - costBasisPortion);

        //then "mini-BUY" into toAccount
        const newLot = {
          account: tx.toAccount,
          asset: tx.asset,
          buyTxId: lot.id,
          buyTxType: lot.type,
          buyPrice: lot.price,
          price: lot.price,
          timestamp: lot.timestamp,
          transferTimestamp: tx.timestamp,
          amount: lotAmount,
          remainingAmount: lotAmount,
          costBasis: currencyRounded(costBasisPortion),
          remainingCostBasis: currencyRounded(costBasisPortion),
          taxTxType: "BUY-TRANSFER",
          sort: (tx.sort ?? 0) + 1,
          id: tx.id,
          type: tx.type,
        };

        undisposedLots.push(newLot);
        undisposedLots = undisposedLots.sort(sortByTimeStampThenSort);

        if (lot.remainingAmount < BigInt("0")) {
          debugger;
          throw new Error("Lot remaining amount negative");
        }
        if (lot.remainingCostBasis < 0.0) {
          debugger;
          throw new Error("Lot remaining cost basis negative");
        }
        remainingAmount -= lotAmount;
        if (remainingAmount > BigInt("0")) {
          lot = findAccountLot(
            {
              asset: tx.asset,
              account: tx.fromAccount,
            },
            undisposedLots
          );
        } else lot = null;
      }
    }
    // if (remainingAmount > BigInt("0")) {
    //   debugger;
    //   // throw new Error(
    //   //   `Cannot find enough transfer inventory for ${tx.fromAccount}:${
    //   //     tx.asset
    //   //   }, amount remaining: ${formatEther(remainingAmount)}`
    //   // );
    // }
    // unreconciledAccounts = verifyBalance(
    //   tx,
    //   runningBalances,
    //   undisposedLots,
    //   soldLots,
    //   unreconciledAccounts
    // );

    return false;
    // if (unreconciledAccounts.length > 0) {
    //   debugger;
    // }
  });
  return { soldLots, undisposedLots, noInventoryTxs, unreconciledAccounts };
}
