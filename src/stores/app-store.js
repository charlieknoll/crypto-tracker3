import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { useSettingsStore } from "./settings-store";
import { useAddressStore } from "./address-store";
import { useOpeningPositionsStore } from "./opening-positions-store";
import { onlyUnique } from "src/utils/array-helpers";
import { ref } from "vue";
import { useChainStore } from "./chain-store";
import { useExchangeTradesStore } from "./exchange-trades-store";
import { useChainTxsStore } from "./chain-txs-store";
export const useAppStore = defineStore("app", {
  state: () => ({
    importing: false,
    lastPricesUpdate: useLocalStorage("lastPricesUpdate", ""),
    importingMessage: ref(""),
    taxYear: useLocalStorage("taxYear", new Date().getFullYear().toString()),
    defaultCurrency: useLocalStorage("defaultCurrency", "USD"),
    needsBackup: useLocalStorage("needsBackup", false),
    needsPrices: useLocalStorage("prices", false),
    minStartYear: 2007,
    selectedAccounts: useLocalStorage("selectedAccounts", []),
    selectedAssets: useLocalStorage("selectedAssets", []),
    selectedChains: useLocalStorage("selectedChains", []),
    onLine: ref(navigator.onLine),
    lastRequestTime: ref(0),
  }),
  getters: {
    taxYears() {
      const result = [];
      const currentYear = new Date().getFullYear();

      const settingsStore = useSettingsStore();
      for (let i = settingsStore.startYear; i <= currentYear; i++) {
        result.push(i);
      }
      result.push("All");
      return result;
    },

    assets() {
      //console.time("assets");
      const chainTxsStore = useChainTxsStore();
      const openingPositionsStore = useOpeningPositionsStore();
      const exchangeTradesStore = useExchangeTradesStore();

      //TODO add offchain and exchange trades stores
      let result = chainTxsStore.accountTxs.map((r) => r.asset);
      result.push(...openingPositionsStore.records.map((r) => r.asset));
      result.push(...exchangeTradesStore.split.map((r) => r.asset));
      result = result.filter(onlyUnique).sort();
      //console.timeEnd("assets");

      return result;
    },
    accounts() {
      //const start = Date.now();
      const addressStore = useAddressStore();
      const openingPositionsStore = useOpeningPositionsStore();
      const exchangeTradesStore = useExchangeTradesStore();
      //TODO add offchain and exchange trades stores
      let accounts = [];

      accounts = addressStore.records
        .filter((r) => r.type !== "Spam")
        .map((r) => r.name);

      accounts.push(...openingPositionsStore.records.map((r) => r.account));
      accounts.push(...exchangeTradesStore.records.map((r) => r.account));
      accounts = accounts.filter(onlyUnique).sort();
      //console.log(`Account duration: ${Date.now() - start} ms`);
      return accounts;
    },
  },
  actions: {
    setYear(year) {
      this.taxYear = year;
    },
  },
});

// export const useAppStore = defineStore("app", () => {
//   const importing = ref(false);
//   const taxYear = useLocalStorage("taxYear", 2021);
//   const needsBackup = ref(false);

//   const taxYears = computed(() => {
//     const result = [];
//     const currentYear = ref(new Date().getFullYear());
//     const settingsStore = useSettingsStore();
//     for (let i = settingsStore.startYear; i <= currentYear.value; i++) {
//       result.push(i);
//     }
//     result.push("All");
//     return result;
//   });

//   function setYear(year) {
//     this.taxYear = year;
//   }
//   return { importing, taxYear, needsBackup, taxYears, setYear };
// });
