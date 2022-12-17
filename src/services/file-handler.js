import { Notify } from "quasar";
import { useAddressStore } from "src/stores/address-store";
import { useAppStore } from "src/stores/app-store";
import { useChainStore } from "src/stores/chain-store";
import { useChainTxsStore } from "src/stores/chain-txs-store";
import { useExchangeTradesStore } from "src/stores/exchange-trades-store";
import { useMethodStore } from "src/stores/methods-store";
import { useOffchainTransfersStore } from "src/stores/offchain-transfers-store";
import { useOpeningPositionsStore } from "src/stores/opening-positions-store";
import { usePricesStore } from "src/stores/prices-store";
import { useSettingsStore } from "src/stores/settings-store";

const waitFor = async function (fn, args, ms, interval) {
  const timeout = function (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };
  let timeoutCtr = 0;
  const iterations = ms / interval;

  while (timeoutCtr < iterations) {
    timeoutCtr++;
    if (await fn(...args)) return true;
    await timeout(interval);
  }
  return false;
};

function processAllDataFile(content) {
  const backup = JSON.parse(content);
  const settings = useSettingsStore();
  settings.$patch(backup.settings);
  if (backup.settings.apikey) {
    settings.etherscanApikey = backup.settings.apikey;
  }
  const addresses = useAddressStore();
  //handle old format splitting multiple chain addresses into separate addresses
  let records = backup.addresses.records ?? backup.addresses;
  for (let i = 0; i < records.length; i++) {
    const address = records[i];
    if (address.chains) {
      const chains = address.chains?.split(",");
      for (let j = 0; j < chains.length; j++) {
        const chain = chains[j];
        address.id = undefined;
        address.chain = chain;
        address.lastBlockSync = address["last" + chain + "BlockSync"];
        addresses.set(address);
      }
    } else {
      addresses.set(address);
    }
  }
  const chains = useChainStore();
  chains.$patch(backup.chains);
  const openingPositions = useOpeningPositionsStore();

  if (!backup.openingPositions.records) {
    const tempRecords = JSON.parse(JSON.stringify(backup.openingPositions));
    backup.openingPositions = { records: tempRecords };
  }
  openingPositions.$patch(backup.openingPositions);

  const exchangeTrades = useExchangeTradesStore();
  if (!backup.exchangeTrades.records) {
    //NOT Supported v1 restore of exchange trades, use manual import and coinbase import
    // const tempRecords = JSON.parse(JSON.stringify(backup.exchangeTrades));
    // backup.exchangeTrades = { records: tempRecords };
    // for (let i = 0; i < backup.exchangeTrades.records.length; i++) {
    //   const exchangeTrade = backup.exchangeTrades.records[i];
    //   exchangeTrade.amount = exchangeTrade.volume;
    //   exchangeTrade.volume = undefined;
    //   if (exchangeTrade.txId.length > 10) {
    //     exchangeTrade.exchangeId = exchangeTrade.txId;
    //   }
    //   exchangeTrade.txId = undefined;
    // }
  } else {
    exchangeTrades.$patch(backup.exchangeTrades);
  }

  const offchainTransfers = useOffchainTransfersStore();
  offchainTransfers.$patch(backup.offchainTransfers);

  const prices = usePricesStore();
  prices.$patch(backup.prices);

  const methods = useMethodStore();
  methods.$patch(backup.methods);

  const chainTxs = useChainTxsStore();
  chainTxs.$patch(backup.chainTxs);

  // const exchangeTrades = useExchangeTradesStore();
  // exchangeTrades.$patch(backup.exchangeTrades);

  //addresses.$patch(backup.addresses);
  const app = useAppStore();
  app.taxYear = "All";

  return (
    1 +
    addresses.records.length +
    chains.records.length +
    openingPositions.records.length +
    exchangeTrades.records.length +
    offchainTransfers.records.length +
    prices.records.length +
    methods.records.length +
    chainTxs.rawAccountTxs.length
  );
}
export const processFile = async function (name, content) {
  //store.updated = true;
  if (name.substring(0, 5) == "openi") {
    const store = useOpeningPositionsStore();
    return await store.load(content);
  }
  if (name.substring(0, 5) == "trade") {
    const store = useExchangeTradesStore();
    //Look for offset
    const offsets = [];
    while (content.substring(0, 6) == "OFFSET") {
      var offset = content.split("\n")[0];
      content = content.substring(offset.length + 1);
      var parts = offset.split(":");
      offsets.push({
        account: parts[1],
        offset: parseInt(parts[2]),
      });
    }

    return store.load(content, offsets);
  }
  // if (name.substring(0, 9) == "addresses") {
  //   return processAddressFile(content);
  // }
  if (name.substring(0, 9) == "transfers") {
    const store = useOffchainTransfersStore();
    return store.load(content);
  }
  // if (name.substring(0, 6) == "prices") {
  //   return processPricesFile(content);
  // }
  // if (name.substring(0, 8) == "settings") {
  //   return processSettingsFile(content);
  // }
  if (name.substring(0, 8) == "all-data") {
    return processAllDataFile(content);
  }
  //return message
};
function showNotify(fileName) {
  const notif = Notify.create({
    group: false, // required to be updatable
    timeout: 0, // we want to be in control when it gets dismissed
    spinner: true,
    message: `Processing ${fileName}...`,
  });
  return notif;
}
function updateNotif(notif, message, iconName) {
  notif({
    message,
    timeout: 4000,
    spinner: false,
    icon: iconName,
    color: iconName == "done" ? "green" : "red",
  });
}
export const processFiles = async function (fileArray, cb) {
  const reader = new FileReader();
  let currentFileName = null;
  reader.onload = async function (event) {
    const notif = showNotify(currentFileName);
    try {
      const result = await processFile(
        currentFileName,
        atob(event.target.result.split("base64,")[1])
      );
      updateNotif(
        notif,
        `Processed ${result} records from ${currentFileName}.`,
        "done"
      );
    } catch (error) {
      updateNotif(notif, `${currentFileName}: ${error.message}`, "error");
    }
    currentFileName = null;
    //console.log(atob(event.target.result.split("base64,")[1]));
  };
  const start = Date.now();

  for (const f of fileArray) {
    currentFileName = f.name;
    reader.readAsDataURL(f);
    await waitFor(
      () => {
        return currentFileName == null;
      },
      "",
      5000,
      100
    );
  }
  console.log(`Import duration: ${Date.now() - start} ms`);
  // const prices = usePricesStore();
  // prices.getPrices();
};
