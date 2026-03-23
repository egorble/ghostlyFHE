const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Upgrading with:", deployer.address);

  // Load proxy addresses
  if (!fs.existsSync('.proxy-addresses.json')) {
    console.error("No .proxy-addresses.json found. Deploy proxies first with deploy-upgradeable.js");
    process.exit(1);
  }
  const addrs = JSON.parse(fs.readFileSync('.proxy-addresses.json', 'utf8'));

  // Specify which contracts to upgrade (comment out what you don't need)
  const upgrades = [
    { name: "ConfidentialInvoice", proxy: addrs.invoiceAddr },
    { name: "ConfidentialReceipt", proxy: addrs.receiptAddr },
    { name: "InvoiceAnalytics", proxy: addrs.analyticsAddr },
    { name: "ConfidentialEscrow", proxy: addrs.escrowAddr },
    { name: "ConfidentialPaymentSplitter", proxy: addrs.splitterAddr },
  ];

  for (const { name, proxy } of upgrades) {
    console.log(`\nUpgrading ${name} at ${proxy}...`);
    const Factory = await hre.ethers.getContractFactory(name);
    const upgraded = await hre.upgrades.upgradeProxy(proxy, Factory, {
      unsafeAllow: ["state-variable-immutable", "constructor"],
    });
    await upgraded.waitForDeployment();
    const implAddr = await hre.upgrades.erc1967.getImplementationAddress(proxy);
    console.log(`   ${name} upgraded! New implementation: ${implAddr}`);
  }

  console.log("\n========================================");
  console.log("  ALL CONTRACTS UPGRADED");
  console.log("  Proxy addresses remain the same");
  console.log("========================================");

  // Regenerate ABIs (in case function signatures changed)
  const contracts = ['ConfidentialInvoice', 'ConfidentialReceipt', 'ConfidentialEscrow', 'ConfidentialPaymentSplitter', 'InvoiceAnalytics'];
  const abis = {};
  for (const c of contracts) {
    const artifact = JSON.parse(fs.readFileSync(`artifacts/contracts/${c}.sol/${c}.json`, 'utf8'));
    abis[c] = artifact.abi;
  }
  fs.writeFileSync('frontend/src/contracts/abis.ts', 'export const ABIS = ' + JSON.stringify(abis, null, 2) + ' as const;\n');
  console.log("Updated frontend/src/contracts/abis.ts");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
