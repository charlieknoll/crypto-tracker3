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
let requests = [];
export const getPrice = function (symbol, tradeDate) {
  if (symbol == "BTC") return 20.0;
  if (symbol == "ETH") return 2;
};
