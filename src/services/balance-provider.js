import {
  formatEther,
  formatUnits,
  JsonRpcProvider,
  Contract,
  getAddress,
} from "ethers";
import { convertToWei } from "src/utils/number-helpers";

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

export { getBalanceAtBlock, getTokenBalanceAtBlock };
