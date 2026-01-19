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

export const getEthApiPrice = async function (hash) {
  let apiUrl = `/get-price?url=https://etherscan.io/tx/${hash}`;

  try {
    const result = await axios.get(apiUrl);
    return parseFloat(result.data.price);
  } catch (error) {
    // console.log(apiUrl);
    // console.log(`Error getting ETH price for tx ${hash}:`);
    // console.error(error);
    console.log("Full error:", error);
    console.log("Response:", error.response?.data);
    console.log("Request:", error.request);
    return 0.0;
  }
};

export const getApiPrice = async function (symbol, tradeDate, throttleFn) {
  const cgTradeDate =
    tradeDate.substring(8, 10) +
    tradeDate.substring(4, 8) +
    tradeDate.substring(0, 4);
  //only 5 req's per second
  //console.log("Last request: " + lastRequestTime);
  //handle multiple async tasks by waiting until there is at least 200ms expired since last request
  const throttleMs = 2100;
  while (new Date().getTime() - lastRequestTime < throttleMs) {
    lastRequestTime = await throttle(new Date().getTime(), throttleMs);
  }
  lastRequestTime = new Date().getTime();

  let price = 0.0;
  let apiUrl = `https://api.coingecko.com/api/v3/coins/${coinGeckoSymbolMap[symbol]}/history?date=${cgTradeDate}&localization=false`;

  while (new Date().getTime() - lastRequestTime < 120500) {
    try {
      const result = await axios.get(apiUrl);
      price = parseFloat(
        result.data.market_data
          ? result.data.market_data.current_price.usd
          : 0.0
      );
      console.log(`${symbol} price on ${tradeDate}: ${price}`);
      return price;
    } catch (error) {
      if (error.response?.status == 404) return 0.0;
      console.log(`Error getting ${symbol} price on ${tradeDate}: ${error}`);
      if (throttleFn) throttleFn();
      await throttle(new Date().getTime(), 120000);
      continue;
    }
  }
  return price;
};
