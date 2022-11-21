function _sleep(ms) {
  console.log(`Sleeping for ${ms / 1000} seconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export const throttle = async function throttle(lastRequestTime, requestDelay) {
  const timestamp = new Date().getTime();
  const elapsed = timestamp - lastRequestTime;
  if (elapsed < requestDelay) {
    //await _sleep(timestamp - lastRequestTime + requestDelay);
    await _sleep(requestDelay - elapsed);
  }
  //First recentRequest will be oldest

  return timestamp;
};
