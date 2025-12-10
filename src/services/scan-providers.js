import { useSettingsStore } from "src/stores/settings-store";

export const getScanProviders = function () {
  const settings = useSettingsStore();
  const result = [];
  let etherScanProvider = {
    baseUrl: "https://api.etherscan.io/v2/api",
    gasType: "ETH",
    explorerUrl: "https://etherscan.io/tx/",
    apikey: settings.etherscanApikey,
    chainId: 1,
  };
  let bscScanProvider = {
    baseUrl: "https://api.etherscan.io/v2/api",
    gasType: "BNB",
    apikey: settings.bscApikey,
    explorerUrl: "https://bscscan.com/tx/",
    chainId: 56,
  };
  result.push(etherScanProvider);
  result.push(bscScanProvider);
  return result;
};
