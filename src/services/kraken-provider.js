// Retrieve ticker data across all markets.
// Endpoint does not require authentication,
// but has utility functions for authentication.
import { useSettingsStore } from "src/stores/settings-store";
import { throttle } from "../utils/cacheUtils";
let lastRequestTimeStamp = Date.now();
let startTimeStamp = 0;
let requestCt = 0;
let privateRequestQueue = Promise.resolve();
async function request({
  method = "GET",
  path = "",
  query = {},
  body = {},
  publicKey = "",
  privateKey = "",
  environment = "",
}) {
  let url = environment + path;
  let queryString = "";
  if (Object.keys(query).length > 0) {
    queryString = mapToURLValues(query).toString();
    url += "?" + queryString;
  }
  let nonce = "";
  if (publicKey.length > 0) {
    nonce = body["nonce"];
    if (!nonce) {
      nonce = getNonce();
      body["nonce"] = nonce;
    }
  }
  const headers = {};
  let bodyString = null;
  if (Object.keys(body).length > 0) {
    bodyString = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }
  // if (publicKey.length > 0) {
  //   headers["API-Key"] = publicKey;
  //   headers["API-Sign"] = getSignature(
  //     privateKey,
  //     queryString + (bodyString || ""),
  //     nonce,
  //     path
  //   );
  // }
  return fetch(url, { method: method, headers: headers, body: bodyString });
}

function getNonce() {
  return Date.now().toString();
}

async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  return crypto.subtle.digest("SHA-256", data);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  const byteArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < byteArray.length; i++) {
    binary += String.fromCharCode(byteArray[i]);
  }
  return btoa(binary);
}

async function getSignature(privateKey, path, nonce, bodyParams) {
  const encoded = mapToURLValues(bodyParams).toString();
  const hash = await sha256(nonce + encoded);
  const encoder = new TextEncoder();
  const pathBytes = encoder.encode(path);
  const combined = new Uint8Array(pathBytes.length + hash.byteLength);
  combined.set(pathBytes, 0);
  combined.set(new Uint8Array(hash), pathBytes.length);

  const secretBytes = base64ToBytes(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    {
      name: "HMAC",
      hash: "SHA-512",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, combined);
  return bytesToBase64(signature);
}

async function privateRequest(path, params = {}) {
  const run = privateRequestQueue.then(async () => {
    const settings = useSettingsStore();
    const apiKey = settings.krakenApikey;
    const privateKey = settings.krakenPrivateKey;

    if (!apiKey || !privateKey) {
      throw new Error("Kraken API key and private key are required.");
    }

    await throttle(lastRequestTimeStamp, 2000);
    lastRequestTimeStamp = Date.now();
    requestCt++;
    console.log(
      `Kraken request #${requestCt} at ${new Date(
        lastRequestTimeStamp
      ).toISOString()}, requests per seocond: ${
        requestCt / ((lastRequestTimeStamp - startTimeStamp) / 1000)
      } `
    );

    const nonce = getNonce();
    const body = {
      nonce,
      ...params,
    };
    const bodyString = mapToURLValues(body).toString();
    const signature = await getSignature(privateKey, path, nonce, body);
    const apiUrl = window.location.origin + "/kraken-api";
    const response = await fetch(apiUrl + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "API-Key": apiKey,
        "API-Sign": signature,
      },
      body: bodyString,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.join(", ") || "Kraken request failed.");
    }
    if (payload?.error?.length > 0) {
      throw new Error(payload.error.join(", "));
    }
    return payload.result;
  });

  privateRequestQueue = run.catch(() => {});
  return run;
}

function mapToURLValues(object) {
  return new URLSearchParams(
    Object.entries(object).map(([k, v]) => {
      if (typeof v == "object") {
        v = JSON.stringify(v);
      }
      return [k, v];
    })
  );
}
const getCurrentPrice = async function (
  asset,
  usdPairs = ["USDC", "USDT", "crvUSD", "DAI", "BUSD", "TUSD", "USDG"]
) {
  const pairMaps = {
    ETH: "XETHZUSD",
    BTC: "XXBTZUSD",
    LTC: "XLTCZUSD",
    XRP: "XXRPZUSD",
  };

  if (usdPairs.includes(asset)) {
    return 1.0;
  }
  if (!asset) {
    return 0.0;
  }
  let pair = pairMaps[asset];
  if (!pair) {
    pair = asset + "USD";
  }
  try {
    const result = await request({
      method: "GET",
      path: "/0/public/Ticker",
      environment: "https://api.kraken.com",
      query: { pair: pair },
    });

    const data = await result.json();
    return data.result[pair]["c"][0];
  } catch (e) {
    console.log("Error getting current price for pair:" + pair, e);
  }
};

const getLedgerEntries = async function (params = {}) {
  if (startTimeStamp == 0) {
    startTimeStamp = Date.now();
  }
  return await privateRequest("/0/private/Ledgers", params);
};

export { getCurrentPrice, getLedgerEntries };
