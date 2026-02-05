const hre = require("hardhat");

async function main() {
  const Token = await hre.ethers.getContractFactory("CourseToken");
  const token = await Token.deploy();
  await token.waitForDeployment();

  const Platform = await hre.ethers.getContractFactory("CoursePlatform");
  const platform = await Platform.deploy(await token.getAddress());
  await platform.waitForDeployment();

  await (await token.setMinter(await platform.getAddress())).wait();

  console.log("TOKEN_ADDRESS:", await token.getAddress());
  console.log("PLATFORM_ADDRESS:", await platform.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
