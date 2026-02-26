import { defineStore } from "pinia";
import {
  useStorage,
  useToNumber,
  useLocalStorage,
  useStorageAsync,
} from "@vueuse/core";

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    // startYear: useToNumber(
    //   useStorageAsync("startYear", new Date().getFullYear(), undefined, {
    //     serializer: {
    //       read: (v) => parseInt(v),
    //       write: (v) => {
    //         debugger;
    //         const nv = parseInt(v);
    //         return nv;
    //       },
    //     },
    //   })
    // ),
    //startYear: 2012,
    startYear: useLocalStorage("startYear", new Date().getFullYear()),
    etherscanApikey: useStorage("etherscanApikey", ""),
    bscApikey: useLocalStorage("bscApikey", ""),
    baseCurrencies: useLocalStorage("baseCurrencies", "USD,USDC,USDT,TUSD,DAI"),
    trackedTokens: useLocalStorage("trackedTokens", ""),
    trackSpentTokens: useLocalStorage("trackSpentTokens", true),
    cbpApikey: useLocalStorage("cbpApikey", ""),
    cbpSecret: useLocalStorage("cbpSecret", ""),
    cbpPassphrase: useLocalStorage("cbpPassphrase", ""),
    krakenApikey: useLocalStorage("krakenApikey", ""),
    krakenPrivateKey: useLocalStorage("krakenPrivateKey", ""),
  }),

  getters: {
    // startYear: (state) => {
    //   return parseInt(state.startYear);
    // },
  },

  actions: {},
});
