const { ethers } = require("ethers");

async function getTokenBalanceAtBlock() {
  const provider = new ethers.JsonRpcProvider(
    "https://ethereum.publicnode.com"
  );

  //const tokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC
  const tokenAddress = "0x575ccd8e2d300e2377b43478339e364000318e2c"; // CRV
  //const walletAddress = "0x003829f919A5F512d54319c5e6894c55E36a74E7"; // ENS
  const walletAddress = "0xd6d16B110ea9173d7cEB6CFe8Ca4060749A75f5c"; // CDAI
  const blockNumber = 24671799n; // BigInt for block number

  // Minimal ERC20 ABI (just balanceOf)
  const erc20Abi = ["function balanceOf(address) view returns (uint256)"];

  const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);

  const balanceWei = await contract.balanceOf(walletAddress, {
    blockTag: blockNumber,
  });
  const balanceFormatted = ethers.formatUnits(balanceWei, 18); // CRV has 18 decimals

  console.log(`CRV balance at block ${blockNumber}: ${balanceFormatted}`);
}

getTokenBalanceAtBlock().catch(console.error);
