import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { useAppStore } from "./app-store";
import { getAddress } from "ethers";
import { getAccountBalance } from "src/services/etherscan-provider";

import {
  getId,
  getInitValue,
  hasValue,
  validate,
} from "src/utils/model-helpers";
import { fields, keyFields, requiredFields } from "src/models/address";
import { sleep } from "src/utils/cacheUtils";
const keyFunc = (r) => getId(r, keyFields);

export const useAddressStore = defineStore("address", {
  state: () => ({
    records: useLocalStorage("addresses", []),
    initValue: getInitValue(fields),
  }),
  getters: {},
  actions: {
    set(upserted) {
      //TODO convert to vuelidate pattern and use fields
      const app = useAppStore();
      if (!hasValue(upserted.name)) {
        upserted.name = upserted.address;
      }
      if (!upserted.lastBlockSync) upserted.lastBlockSync = 0;
      let errorMessage = validate(upserted, requiredFields);
      try {
        if (upserted.address) {
          upserted.address = getAddress(upserted.address.toLowerCase());
          upserted.address = upserted.address.toLowerCase();
        }
      } catch (err) {
        errorMessage += err.reason;
      }

      if (errorMessage) return errorMessage;
      const record = this.records.find((r) => {
        return r.id == upserted.id;
      });

      let dup;
      //Look for duplicate key if composite key updated or inserting
      if ((record && upserted.id != keyFunc(upserted)) || !record) {
        dup = this.records.find((r) => {
          return r.id == keyFunc(upserted);
        });
      }

      if (dup) return "Duplicate address/chain record";

      upserted.id = keyFunc(upserted);
      if (!record) {
        this.records.push(Object.assign({}, upserted));
      } else {
        Object.assign(record, upserted);
      }

      app.needsBackup = true;
      return "";
    },
    delete(id) {
      this.records = this.records.filter((r) => r.id != id);
    },
    clear() {
      this.records = [];
    },
    clearUnnamed() {
      this.records = this.records.filter((r) => r.address != r.name);
    },
    clearLastBlockSyncs() {
      for (let i = 0; i < this.records.length; i++) {
        this.records[i].lastBlockSync = 0;
      }
    },
    async updateBalances() {
      const app = useAppStore();
      app.importing = true;
      try {
        for (let i = 0; i < this.records.length; i++) {
          const addr = this.records[i];
          if (addr.type == "Owned" && addr.chain == "ETH") {
            const balance = await getAccountBalance(addr);
            await sleep(500);
            addr.balance = balance;
          }
        }
      } finally {
        app.importing = false;
      }
    },
  },
});
