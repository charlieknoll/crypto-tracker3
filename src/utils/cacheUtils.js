export const sleep = function (ms) {
  console.log(`Sleeping for ${ms / 1000} seconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
};
export const throttle = async function throttle(lastRequestTime, requestDelay) {
  const timestamp = new Date().getTime();
  const elapsed = timestamp - lastRequestTime;
  console.log(
    `Elapsed time since last request: ${elapsed} ms, delay is ${
      requestDelay - elapsed
    } ms at ${timestamp}`
  );
  if (elapsed < requestDelay) {
    await sleep(requestDelay - elapsed);
  }
  return timestamp;
};
