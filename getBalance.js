const { ethers } = require("ethers");

async function getBalanceAtBlock() {
  // Public Ethereum mainnet RPC endpoint
  const provider = new ethers.JsonRpcProvider(
    "https://ethereum.publicnode.com"
  );

  const address = "0xd6d16B110ea9173d7cEB6CFe8Ca4060749A75f5c"; // Vitalik's address
  const blockNumber = 14880928; // Specific block

  const balanceWei = await provider.getBalance(address, blockNumber);
  const balanceEth = ethers.formatEther(balanceWei);

  console.log(`Balance at block ${blockNumber}: ${balanceEth} ETH`);
}

getBalanceAtBlock().catch(console.error);
