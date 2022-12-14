"use strict";
import crypto from "crypto-browserify";
import querystring from "querystring-es3";
import { checkAuth } from "./utilities";
import { Buffer } from "buffer";
import { Transform } from "vite-compatible-readable-stream";
import CryptoJS from "crypto-js";
/**
 Signs request messages for authenticated requests to Coinbase Pro
 * @param auth {object} hash containing key, secret and passphrase
 * @param method {string} The REST method to use
 * @param path {string} The request path, e.g. /products/BTC-USD/ticker
 * @param [options] {object} An optional object containing one of
 * @param options.body {object} A hash of body properties
 * @param options.qs {object} A hash of query string parameters
 * @returns {{key: string, signature: *, timestamp: number, passphrase: string}}
 */
export const signRequest = (auth, method, path, options = {}) => {
  checkAuth(auth);
  const timestamp = Date.now() / 1000;
  let body = "";
  if (options.body) {
    body = JSON.stringify(options.body);
  } else if (options.qs && Object.keys(options.qs).length !== 0) {
    body = "?" + querystring.stringify(options.qs);
  }
  const what = timestamp + method.toUpperCase() + path + body;

  const crypted = CryptoJS.HmacSHA256(
    what,
    CryptoJS.enc.Base64.parse(auth.secret)
  );
  const signature = CryptoJS.enc.Base64.stringify(crypted);
  return {
    key: auth.key,
    signature: signature,
    timestamp: timestamp,
    passphrase: auth.passphrase,
  };
};
