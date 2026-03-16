import {
  formatEther,
  formatUnits,
  JsonRpcProvider,
  Contract,
  getAddress,
} from "ethers";
import { convertToWei } from "src/utils/number-helpers";

const crvGaugeAbi = ["function claimable_tokens(address) returns (uint256)"];
const curvePoolAbi = [
  "function liquidity_gauge() view returns (address)",
  "function gauge() view returns (address)",
];
const curveAddressProviderAbi = [
  "function get_address(uint256) view returns (address)",
];
const curveMetaRegistryAbi = [
  "function get_gauge(address) view returns (address)",
];
const curveRegistryAbi = [
  "function get_gauges(address) view returns (address[10], int128[10])",
];
const CURVE_ADDRESS_PROVIDER = "0x0000000022D53366457F9d5E68Ec105046FC4383";
const CURVE_METAREGISTRY_ID = 7;
const CURVE_REGISTRY_ADDRESSES = ["0x90E00ACe148ca3b23AcCd7cDdc3A0E29E79A3A4f"];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const getBalanceAtBlock = async function (address, blockNumber) {
  // Public Ethereum mainnet RPC endpoint
  const provider = new JsonRpcProvider("https://ethereum.publicnode.com");

  // const address = "0xd6d16B110ea9173d7cEB6CFe8Ca4060749A75f5c"; // Vitalik's address
  // const blockNumber = 14880928; // Specific block

  const balanceWei = await provider.getBalance(address, parseInt(blockNumber));
  const balanceEth = formatEther(balanceWei);
  return balanceWei;
  //console.log(`Balance at block ${blockNumber}: ${balanceEth} ETH`);
};

async function getTokenBalanceAtBlock(
  tokenName,
  tokenAddress,
  walletAddress,
  blockNumber
) {
  const provider = new JsonRpcProvider("https://ethereum.publicnode.com");

  // const contractAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC
  // const walletAddress = "0x003829f919A5F512d54319c5e6894c55E36a74E7"; // ENS
  // const blockNumber = 24070850n; // BigInt for block number

  // Minimal ERC20 ABI (just balanceOf)
  //const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
  let erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];
  let balanceWei;
  let decimals;
  if (tokenName == "OMG") {
    tokenAddress = "0xd26114cd6EE289AccF82350c8d8487fedB8A0C07";
    decimals = 18;
    erc20Abi = [
      "function balanceOf(address _owner) constant returns (uint balance)",
    ];
  }

  if (tokenName == "GTC") {
    tokenAddress = "0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F";
    decimals = 18;
    erc20Abi = [
      "function balanceOf(address account) external view returns (uint)",
    ];
  }
  if (tokenName == "CRV") {
    decimals = 18;
    tokenAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52";
  }
  tokenAddress = getAddress(tokenAddress);
  walletAddress = getAddress(walletAddress);

  const contract = new Contract(tokenAddress, erc20Abi, provider);

  try {
    // const code = await provider.getCode(
    //   "0xd26114cd6EE289AccF82350c8d8487fedB8A0C07"
    // );
    // console.log("Contract code:", code); // "0x" = empty (no contract)

    balanceWei = await contract.balanceOf(walletAddress, {
      blockTag: parseInt(blockNumber),
    });
    if (!decimals) {
      decimals = await contract.decimals({
        blockTag: parseInt(blockNumber),
      });
    }
  } catch (error) {
    console.log(error);
    return;
  }

  const balanceFormatted = formatUnits(balanceWei, decimals); // USDC has 6 decimals

  console.log(
    `${walletAddress} ${tokenName} balance at block ${blockNumber}: ${balanceFormatted}`
  );

  return convertToWei(balanceWei, decimals);
}

async function getCrvClaimableAmount(address, gaugeAddress) {
  const provider = new JsonRpcProvider("https://ethereum.publicnode.com");
  const walletAddress = getAddress(String(address).toLowerCase());

  if (!gaugeAddress) return convertToWei(0, 18);

  const gaugeContractAddress = getAddress(String(gaugeAddress).toLowerCase());
  const contract = new Contract(gaugeContractAddress, crvGaugeAbi, provider);

  try {
    const claimableAmount = await contract.claimable_tokens.staticCall(
      walletAddress
    );
    return convertToWei(claimableAmount, 18);
  } catch (error) {
    console.log(error);
    return convertToWei(0, 18);
  }
}

async function getCurveGaugeAddressByPool(poolAddress) {
  const provider = new JsonRpcProvider("https://ethereum.publicnode.com");
  const normalizedPoolAddress = getAddress(String(poolAddress).toLowerCase());
  const poolContract = new Contract(
    normalizedPoolAddress,
    curvePoolAbi,
    provider
  );

  try {
    const gaugeAddress = await poolContract.liquidity_gauge();
    if (gaugeAddress && gaugeAddress !== ZERO_ADDRESS) {
      return getAddress(gaugeAddress);
    }
  } catch (error) {
    // ignore and continue
  }

  try {
    const gaugeAddress = await poolContract.gauge();
    if (gaugeAddress && gaugeAddress !== ZERO_ADDRESS) {
      return getAddress(gaugeAddress);
    }
  } catch (error) {
    // ignore and continue
  }

  try {
    const addressProvider = new Contract(
      CURVE_ADDRESS_PROVIDER,
      curveAddressProviderAbi,
      provider
    );
    const metaRegistryAddress = await addressProvider.get_address(
      CURVE_METAREGISTRY_ID
    );

    if (metaRegistryAddress && metaRegistryAddress !== ZERO_ADDRESS) {
      const metaRegistry = new Contract(
        metaRegistryAddress,
        curveMetaRegistryAbi,
        provider
      );
      const gaugeAddress = await metaRegistry.get_gauge(normalizedPoolAddress);

      if (gaugeAddress && gaugeAddress !== ZERO_ADDRESS) {
        return getAddress(gaugeAddress);
      }
    }
  } catch (error) {
    // ignore and continue
  }

  for (const registryAddress of CURVE_REGISTRY_ADDRESSES) {
    try {
      const registryContract = new Contract(
        registryAddress,
        curveRegistryAbi,
        provider
      );
      const result = await registryContract.get_gauges(normalizedPoolAddress);
      const gauges = result?.[0] || [];
      const firstGauge = gauges.find((item) => item && item !== ZERO_ADDRESS);

      if (firstGauge) return getAddress(firstGauge);
    } catch (error) {
      // ignore and continue
    }
  }

  return;
}

async function getCrvClaimableAmountByPool(address, poolAddress) {
  const gaugeAddress = await getCurveGaugeAddressByPool(poolAddress);
  if (!gaugeAddress) return convertToWei(0, 18);

  return getCrvClaimableAmount(address, gaugeAddress);
}

export {
  getBalanceAtBlock,
  getTokenBalanceAtBlock,
  getCrvClaimableAmount,
  getCurveGaugeAddressByPool,
  getCrvClaimableAmountByPool,
};
