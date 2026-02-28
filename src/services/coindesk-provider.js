import { useSettingsStore } from "src/stores/settings-store";

const SPOT_URL = "spot/v1/historical/days";

export const getPrice = async function (pair, timestamp) {
  if (!pair) {
    throw new Error("pair is required");
  }
  if (!timestamp) {
    throw new Error("timestamp is required");
  }
  const settings = useSettingsStore();
  if (!settings.coindeskApikey) {
    throw new Error("CoinDesk API key is required");
  }
  const apiKey = settings.coindeskApikey;

  const query = new URLSearchParams({
    api_key: apiKey,
    market: "kraken",
    instrument: pair,
    limit: "1",
    aggregate: "1",
    fill: "true",
    apply_mapping: "true",
    response_format: "JSON",
    to_ts: `${timestamp}`,
  });

  const response = await fetch(`/coindesk-api/${SPOT_URL}?${query.toString()}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.Message || "Failed to fetch CoinDesk price");
  }

  const row = payload?.Data?.[0];
  if (!row) {
    return 0.0;
  }

  const price = row.CLOSE ?? row.LAST_TRADE_PRICE ?? row.OPEN ?? 0.0;
  console.log(
    `Fetched price for ${pair} at ${new Date(
      timestamp * 1000
    ).toISOString()}: ${price}`
  );
  return parseFloat(price);
};
