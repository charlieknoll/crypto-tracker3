function _sleep(ms) {
  console.log(`Sleeping for ${ms / 1000} seconds...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}
export const throttle = async function throttle(lastRequestTime, requestDelay) {
  //Don't allow more than 5 req's/sec
  const timestamp = new Date().getTime();
  if (timestamp - lastRequestTime < requestDelay) {
    await _sleep(timestamp - lastRequestTime + requestDelay);
  }
  //First recentRequest will be oldest

  return timestamp;
};
