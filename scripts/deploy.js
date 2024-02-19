const { ethers } = require("hardhat");

async function main() {
  const [owner, user] = await ethers.getSigners();

  const FEE_RATE = 500;
  const FeeValueStorage = await ethers.getContractFactory("FeeValueStorage", owner);
  const feeValueStorage = await FeeValueStorage.deploy(FEE_RATE);
  await feeValueStorage.waitForDeployment();
  console.log("Address of FeeValueStorage: " + feeValueStorage.target);

  const CosmicWallet = await ethers.getContractFactory("CosmicWallet", owner);
  const cosmicWallet = await CosmicWallet.deploy(user.address, feeValueStorage.target, owner.address);
  await cosmicWallet.waitForDeployment();
  console.log("Address of Wallet: " + cosmicWallet.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
