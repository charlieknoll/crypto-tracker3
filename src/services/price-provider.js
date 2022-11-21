import axios from "axios";
import { throttle } from "../utils/cacheUtils";

//TODO add this to settings
const coinGeckoSymbolMap = {};
coinGeckoSymbolMap["BTC"] = "bitcoin";
coinGeckoSymbolMap["ETH"] = "ethereum";
coinGeckoSymbolMap["CRV"] = "curve-dao-token";
coinGeckoSymbolMap["GTC"] = "gitcoin";
coinGeckoSymbolMap["BNB"] = "binancecoin";
coinGeckoSymbolMap["EPS"] = "ellipsis";

let lastRequestTime = 0;
export const getApiPrice = async function (symbol, tradeDate) {
  const cgTradeDate =
    tradeDate.substring(8, 10) +
    tradeDate.substring(4, 8) +
    tradeDate.substring(0, 4);
  //only 5 req's per second
  //console.log("Last request: " + lastRequestTime);
  //handle multiple async tasks by waiting until there is at least 200ms expired since last request
  while (new Date().getTime() - lastRequestTime < 200) {
    lastRequestTime = await throttle(new Date().getTime(), 200);
  }
  lastRequestTime = new Date().getTime();

  let price = 0.0;
  let apiUrl = `https://api.coingecko.com/api/v3/coins/${coinGeckoSymbolMap[symbol]}/history?date=${cgTradeDate}&localization=false`;

  while (new Date().getTime() - lastRequestTime < 60000) {
    try {
      const result = await axios.get(apiUrl);
      price = parseFloat(
        result.data.market_data
          ? result.data.market_data.current_price.usd
          : 0.0
      );
      console.log("price: " + price);
      return price;
    } catch (error) {
      if (error.response.status == 404) return 0.0;
      console.log("Error getting price: ", error);
      await throttle(new Date().getTime(), 10000);
      continue;
    }
  }
  return price;
};
