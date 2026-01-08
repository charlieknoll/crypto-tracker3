const { ethers } = require("ethers");

async function getTokenBalanceAtBlock() {
  const provider = new ethers.JsonRpcProvider(
    "https://ethereum.publicnode.com"
  );

  const tokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC
  const walletAddress = "0x003829f919A5F512d54319c5e6894c55E36a74E7"; // ENS
  const blockNumber = 24070850n; // BigInt for block number

  // Minimal ERC20 ABI (just balanceOf)
  const erc20Abi = ["function balanceOf(address) view returns (uint256)"];

  const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);

  const balanceWei = await contract.balanceOf(walletAddress, {
    blockTag: blockNumber,
  });
  const balanceFormatted = ethers.formatUnits(balanceWei, 6); // USDC has 6 decimals

  console.log(`USDC balance at block ${blockNumber}: ${balanceFormatted}`);
}

getTokenBalanceAtBlock().catch(console.error);
