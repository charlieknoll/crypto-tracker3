import { useSettingsStore } from "src/stores/settings-store";

export const getScanProviders = function () {
  const settings = useSettingsStore();
  const result = [];
  let etherScanProvider = {
    baseUrl: "https://api.etherscan.io/api",
    gasType: "ETH",
    explorerUrl: "https://etherscan.io/tx/",
    apikey: settings.etherscanApikey,
  };
  let bscScanProvider = {
    baseUrl: "https://api.bscscan.com/api",
    gasType: "BNB",
    apikey: settings.bscApikey,
    explorerUrl: "https://bscscan.com/tx/",
  };
  result.push(etherScanProvider);
  result.push(bscScanProvider);
  return result;
};
