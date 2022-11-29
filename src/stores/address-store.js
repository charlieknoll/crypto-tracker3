import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { useAppStore } from "./app-store";
import { ethers } from "ethers";

import {
  getId,
  getInitValue,
  hasValue,
  validate,
} from "src/utils/model-helpers";
import { fields, keyFields, requiredFields } from "src/models/address";
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
          upserted.address = ethers.utils.getAddress(
            upserted.address.toLowerCase()
          );
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
  },
});
