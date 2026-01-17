// Retrieve ticker data across all markets.
// Endpoint does not require authentication,
// but has utility functions for authentication.

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
const getCurrentPrice = async function (asset) {
  const pairMaps = {
    ETH: "XETHZUSD",
    BTC: "XXBTZUSD",
    LTC: "XLTCZUSD",
    XRP: "XXRPZUSD",
  };
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

export { getCurrentPrice };
