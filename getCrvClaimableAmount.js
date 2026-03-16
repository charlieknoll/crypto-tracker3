const { ethers } = require("ethers");

const CRV_GAUGE_ABI = ["function claimable_tokens(address) returns (uint256)"];
const CURVE_POOL_ABI = [
  "function liquidity_gauge() view returns (address)",
  "function gauge() view returns (address)",
];
const CURVE_ADDRESS_PROVIDER_ABI = [
  "function get_address(uint256) view returns (address)",
];
const CURVE_METAREGISTRY_ABI = [
  "function get_gauge(address) view returns (address)",
];
const CURVE_REGISTRY_ABI = [
  "function get_gauges(address) view returns (address[10], int128[10])",
];
const CURVE_ADDRESS_PROVIDER = "0x0000000022D53366457F9d5E68Ec105046FC4383";
const CURVE_METAREGISTRY_ID = 7;
const CURVE_REGISTRY_ADDRESSES = ["0x90E00ACe148ca3b23AcCd7cDdc3A0E29E79A3A4f"];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function getCurveGaugeAddressByPool(poolAddress, provider) {
  const normalizedPoolAddress = ethers.getAddress(
    String(poolAddress).toLowerCase()
  );
  const poolContract = new ethers.Contract(
    normalizedPoolAddress,
    CURVE_POOL_ABI,
    provider
  );

  try {
    const gaugeAddress = await poolContract.liquidity_gauge();
    if (gaugeAddress && gaugeAddress !== ZERO_ADDRESS) {
      return ethers.getAddress(gaugeAddress);
    }
  } catch (error) {
    // ignore and continue
  }

  try {
    const gaugeAddress = await poolContract.gauge();
    if (gaugeAddress && gaugeAddress !== ZERO_ADDRESS) {
      return ethers.getAddress(gaugeAddress);
    }
  } catch (error) {
    // ignore and continue
  }

  try {
    const addressProvider = new ethers.Contract(
      CURVE_ADDRESS_PROVIDER,
      CURVE_ADDRESS_PROVIDER_ABI,
      provider
    );
    const metaRegistryAddress = await addressProvider.get_address(
      CURVE_METAREGISTRY_ID
    );

    if (metaRegistryAddress && metaRegistryAddress !== ZERO_ADDRESS) {
      const metaRegistry = new ethers.Contract(
        metaRegistryAddress,
        CURVE_METAREGISTRY_ABI,
        provider
      );
      const gaugeAddress = await metaRegistry.get_gauge(normalizedPoolAddress);

      if (gaugeAddress && gaugeAddress !== ZERO_ADDRESS) {
        return ethers.getAddress(gaugeAddress);
      }
    }
  } catch (error) {
    // ignore and continue
  }

  for (const registryAddress of CURVE_REGISTRY_ADDRESSES) {
    try {
      const registryContract = new ethers.Contract(
        registryAddress,
        CURVE_REGISTRY_ABI,
        provider
      );
      const result = await registryContract.get_gauges(normalizedPoolAddress);
      const gauges = result?.[0] || [];
      const firstGauge = gauges.find((item) => item && item !== ZERO_ADDRESS);

      if (firstGauge) return ethers.getAddress(firstGauge);
    } catch (error) {
      // ignore and continue
    }
  }

  return;
}

async function getCrvClaimableAmount(address, gaugeAddress) {
  const provider = new ethers.JsonRpcProvider(
    "https://ethereum.publicnode.com"
  );
  const walletAddress = ethers.getAddress(String(address).toLowerCase());
  const gaugeContractAddress = ethers.getAddress(
    String(gaugeAddress).toLowerCase()
  );
  const contract = new ethers.Contract(
    gaugeContractAddress,
    CRV_GAUGE_ABI,
    provider
  );

  try {
    const claimableAmountWei = await contract.claimable_tokens.staticCall(
      walletAddress
    );
    return claimableAmountWei;
  } catch (error) {
    if (error?.code === "CALL_EXCEPTION") {
      return 0n;
    }
    throw error;
  }
}

async function main() {
  const address = process.argv[2];
  const targetAddress = process.argv[3];
  const addressType = process.argv[4];

  if (!address || !targetAddress) {
    console.error(
      "Usage: node getCrvClaimableAmount.js <walletAddress> <gaugeAddress> OR node getCrvClaimableAmount.js <walletAddress> <poolAddress> --pool"
    );
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(
    "https://ethereum.publicnode.com"
  );
  const gaugeAddress =
    addressType === "--pool"
      ? await getCurveGaugeAddressByPool(targetAddress, provider)
      : targetAddress;

  if (!gaugeAddress) {
    console.log(`Address: ${address}`);
    console.log(`Pool: ${targetAddress}`);
    console.log("Gauge: not found");
    console.log("Claimable CRV (wei): 0");
    console.log("Claimable CRV: 0.0");
    return;
  }

  const claimableAmountWei = await getCrvClaimableAmount(address, gaugeAddress);
  const claimableAmountCrv = ethers.formatUnits(claimableAmountWei, 18);

  console.log(`Address: ${address}`);
  if (addressType === "--pool") {
    console.log(`Pool: ${targetAddress}`);
  }
  console.log(`Gauge: ${gaugeAddress}`);
  console.log(`Claimable CRV (wei): ${claimableAmountWei.toString()}`);
  console.log(`Claimable CRV: ${claimableAmountCrv}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
