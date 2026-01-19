const { ethers } = require("ethers");

function sleep(ms) {
  console.log(`Sleeping for ${ms / 1000} seconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTokenBalanceAtBlock() {
  const provider = new ethers.JsonRpcProvider(
    "https://ethereum.publicnode.com"
  );

  const tokenAddress = "0x92F1dBEA03Ce08225e31E95Cc926dDBE0198e6f2"; // Old Token
  const walletAddress = "0xC31b19ac6F3Aad91d22A9AA8eD52F4969F62d5dD"; // ENS
  const blockNumber = 24070850n; // BigInt for block number'],
  const addresses = [
    "0xd6d16B110ea9173d7cEB6CFe8Ca4060749A75f5c",
    "0xd6d16B110ea9173d7cEB6CFe8Ca4060749A75f5c",
    "0x52d37dEb8dAc393E527C1a18ED23597DCeEF1a55",
    "0x003829f919A5F512d54319c5e6894c55E36a74E7",
    "0x24f7065b079d818b22aa6dda36f259a026655305",
    "0xC31b19ac6F3Aad91d22A9AA8eD52F4969F62d5dD",
    "0x179bfa703e24ab27d157ef6d520f10698b7e8400",
    "0x05f51d095d77C3D2Ff46A4e76B0790647A72dd77",
    "0x04ebee32F994759fCad99b504d653732078Cb20b",
    "0x000c2a2f29d6c9d10b0b4974458f6505668d0215",
    "0xC96983f2d30834c4125CE060Bceba9863286402a",
    "0xef5184cd2bbb274d787beab010141a0a85626e7b",
    "0x93b6d050f13e824c49b91ee0e7b17ea7afdb01ea",
    "0xeA0f7A698dBd9A811e1F25fA94986bB01b30B4d0",
    "0xd76ee9a2df568eb27eb7e89a2fbcb0433ac60828",
    "0x9cEF884224Ce376a1d68e5d1f80db89D24F5cf2C",
    "0xF75A59CA3A0180D3Eb27DF610746ba9056218db4",
    "0xee80ef3c49d9465c7fc2b3d7373fdbbbc3fe282f",
    "0xd4dc4b9843c73687bfc779afb40669da5f766ef6",
    "0x48040276e9c17ddbe5c8d2976245dcd0235efa43",
    "0x590ccb5911cf78f6f622f535c474375f4a12cfcf",
    "0x199758d97a25c4411817c222f3fcde8ab84a7385",
  ];

  // Minimal ERC20 ABI (just balanceOf)
  //const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function sellTokens() view returns (uint8)",
    "function symbol() view returns (string)",
  ];
  // const erc20Abi = [
  //   "function sellTokens(uint256 _amountOfTokens) returns (uint8)",
  // ];

  const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);

  const symbol = await contract.symbol();
  console.log("Symbol:", symbol);

  return;

  //const balanceWei = await contract.balanceOf(walletAddress);
  for (const a of addresses) {
    const balanceWei = await contract.balanceOf(a);
    console.log(`${a} Balance):`, balanceWei);
    await sleep(1000);
  }

  const decimals = await contract.decimals();
  console.log("Decimals:", decimals);

  const totalSupply = await contract.totalSupply();
  console.log("Supply:", totalSupply);
  const balanceFormatted = ethers.formatUnits(balanceWei, decimals); // USDC has 6 decimals

  console.log(`USDC balance at block ${blockNumber}: ${balanceFormatted}`);
  const supplyFormatted = ethers.formatUnits(totalSupply, decimals); // USDC has 6 decimals

  console.log(`Total Supply: ${supplyFormatted}`);

  console.log("Sell Tokens:", await contract.sellTokens(balanceWei));
}

getTokenBalanceAtBlock().catch(console.error);
