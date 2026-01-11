const { ethers } = require("ethers");

async function withDraw() {
  const provider = new ethers.JsonRpcProvider(
    "https://ethereum.publicnode.com"
  );

  const tokenAddress = "0x92F1dBEA03Ce08225e31E95Cc926dDBE0198e6f2"; // Old Token
  const walletAddress = "0xC31b19ac6F3Aad91d22A9AA8eD52F4969F62d5dD"; // ENS

  // // Minimal ERC20 ABI (just balanceOf)
  // //const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
  // const erc20Abi = [
  //   "function balanceOf(address) view returns (uint256)",
  //   "function decimals() view returns (uint8)",
  //   "function totalSupply() view returns (uint256)",
  //   "function sellTokens() view returns (uint8)",
  // ];
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function sellTokens(uint256 _amountOfTokens) returns (uint8)",
  ];

  const signer = new ethers.Wallet(
    //TODO get private key from Metamask #1
    "0xc31b19ac6f3aad91d22a9aa8ed52f4969f62d5dd",
    provider
  );
  const contract = new ethers.Contract(tokenAddress, erc20Abi, signer);

  const balanceWei = await contract.balanceOf(walletAddress);
  console.log("Balance to sell:", balanceWei);

  const decimals = await contract.decimals();
  console.log("Decimals:", decimals);

  const nonce = await provider.getTransactionCount(signer.address);
  console.log("Nonce:", nonce);

  try {
    const tx = await contract.sellTokens(balanceWei, {
      gasLimit: 50000n,
      maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("0.05", "gwei"),
      nonce: nonce,
      value: 0n,
    });
    console.log("Tx hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Confirmed in block:", receipt.blockNumber);
  } catch (error) {
    console.error("Sell failed:", error);
  }
}

withDraw().catch(console.error);
