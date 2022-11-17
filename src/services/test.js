const axios = require("axios");
const crypto = require("crypto");
const CoinbasePro = require("coinbase-pro");
const apikey = "36990dd1f6ea11c1647b23e19365e669";
const timestamp = Date.now() / 1000;
const passphrase = "ouyu64uqnrg";
const secret =
  "wz+D8/DMY6aFZIkYMWeKOrNz+lm6gQMePnXd8AkPcH5ODM4C1hRrG5FopJ1fwTlTDwvX4wXS55E4UT9o3Ue9bw==";
const path = "/orders";
const method = "GET";
const data = null;
const body = data ? JSON.stringify(data) : null;
const apiUrl = "https://api.pro.coinbase.com";

let what;

const authedClient = new CoinbasePro.AuthenticatedClient(
  apikey,
  secret,
  passphrase,
  apiUrl
);
async function getTrades() {
  const result = await authedClient.getAccounts();
  const ethAccount = result.find(a => a.currency == "ETH");

  const ethHistory = await authedClient.getAccountHistory(ethAccount.id);
  console.log("results", result);
}

// if (body == null) {
//   what = timestamp + method + path;
// } else {
//   what = timestamp + method + path + JSON.stringify(body);
// }

// // decode the base64 secret
// const key = Buffer.from(secret, "base64");

// // create a sha256 hmac with the secret
// const hmac = crypto.createHmac("sha256", key);

// // sign the require message with the hmac
// // and finally base64 encode the result
// const signature = hmac.update(what).digest("base64");

// // const hmac = crypto.createHmac("sha256", key);

// // const signature = hmac.update(what).digest("base64");

// async function getTrades() {
//   const config = {
//     /*eslint-disable */
//     headers: {
//       "User-Agent": "cryptotracker/1.0.2",
//       // eslint-disable-next-line no-use-before-define
//       Accept: "application/json", // eslint-disable-next-line no-use-before-define
//       "Content-Type": "application/json",
//       "CB-ACCESS-KEY": apikey,
//       "CB-ACCESS-SIGN": signature,
//       "CB-ACCESS-TIMESTAMP": timestamp,
//       "CB-ACCESS-PASSPHRASE": passphrase
//     }
//     /*eslint-enable */
//   };

//   try {
//     const result = await axios.get(apiUrl + path, body, config);
//     //console.log("Delta: " + (timestamp - result.data.epoch));
//     console.log("result: ", result);
//   } catch (error) {
//     console.log("error: ", error);
//   }
// }

getTrades();
