const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const addrs = JSON.parse(fs.readFileSync('.proxy-addresses.json', 'utf8'));

  const list = [
    { name: "InvoiceAnalytics", proxy: addrs.analyticsAddr },
    { name: "ConfidentialPaymentSplitter", proxy: addrs.splitterAddr },
  ];

  for (const { name, proxy } of list) {
    console.log(`Upgrading ${name}...`);
    const Factory = await hre.ethers.getContractFactory(name);
    const upgraded = await hre.upgrades.upgradeProxy(proxy, Factory, {
      unsafeAllow: ["state-variable-immutable", "constructor"],
    });
    await upgraded.waitForDeployment();
    const impl = await hre.upgrades.erc1967.getImplementationAddress(proxy);
    console.log(`  ✅ ${name} → ${impl}`);
    // Wait between deploys
    await new Promise(r => setTimeout(r, 10000));
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
