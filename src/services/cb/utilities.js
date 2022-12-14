const determineProductIDs = function (productIDs) {
  if (!productIDs || !productIDs.length) {
    return ["BTC-USD"];
  }

  if (Array.isArray(productIDs)) {
    return productIDs;
  }

  // If we got this far, it means it's a string.
  // Return an array for backwards compatibility.
  return [productIDs];
};

const checkAuth = function (auth) {
  if (auth && !(auth.key && auth.secret && auth.passphrase)) {
    throw new Error(
      "Invalid or incomplete authentication credentials. Please provide all of the key, secret, and passphrase fields."
    );
  }
  return auth || {};
};

export { determineProductIDs, checkAuth };
