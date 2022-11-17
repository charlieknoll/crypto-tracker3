import { store } from "../boot/store";
import { actions } from "../boot/actions";
import axios from "axios";
import { throttle } from "../utils/cacheUtils";

const coinGeckoSymbolMap = {};
coinGeckoSymbolMap["BTC"] = "bitcoin";
coinGeckoSymbolMap["ETH"] = "ethereum";
coinGeckoSymbolMap["CRV"] = "curve-dao-token";
coinGeckoSymbolMap["GTC"] = "gitcoin";
coinGeckoSymbolMap["BNB"] = "binancecoin";
coinGeckoSymbolMap["EPS"] = "ellipsis";
let lastRequestTime = 0;
let requests = [];
export const getPrice = async function (symbol, tradeDate) {
  const prices = actions.getData("prices") ?? [];
  const tradeDatePrice = prices.find(
    (p) => p.symbol == symbol && p.tradeDate == tradeDate
  );

  if (tradeDatePrice) {
    return tradeDatePrice.price;
  }
  if (actions.getBaseCurrencies().find((bc) => bc == symbol)) {
    return 1.0;
  }
  //manual overrides
  if (symbol == "3Crv" && tradeDate == "2021-04-29") {
    return 1.01;
  }
  if (symbol == "3Crv" && tradeDate == "2021-06-07") {
    return 1.01;
  }
  //Get price from Coingecko
  if (!coinGeckoSymbolMap[symbol]) {
    //TODO add to coingecko symbol list without coinid, auto lookup?
    //console.error("Symbol not found: " + symbol);

    return 0.0;
  }
  //dd-mm-yyyy
  const cgTradeDate =
    tradeDate.substring(8, 10) +
    tradeDate.substring(4, 8) +
    tradeDate.substring(0, 4);
  lastRequestTime = await throttle(lastRequestTime, 50);
  requests.push(lastRequestTime); //100req's per minute
  const currentTime = new Date().getTime();
  //requests in last 60
  requests = requests.filter((r) => r > currentTime - 60000);
  if (requests.length > 50) {
    await throttle(currentTime, 1000);
  }

  let apiUrl = `https://api.coingecko.com/api/v3/coins/${coinGeckoSymbolMap[symbol]}/history?date=${cgTradeDate}&localization=false`;
  try {
    while (new Date().getTime() - lastRequestTime < 60000) {
      try {
        const result = await axios.get(apiUrl);
        const price = parseFloat(
          result.data.market_data
            ? result.data.market_data.current_price.usd
            : 0.0
        );
        prices.push({
          symbol,
          tradeDate,
          price,
        });
        actions.setData("prices", prices);
        actions.setObservableData("pricesNeedsBackup", true);
        return price;
      } catch (error) {
        await throttle(new Date().getTime(), 10000);
        continue;
      }
    }
  } catch (err) {
    console.log("error getting price: ", err);
  }
  return 0.0;
};
