const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Upgrading with:", deployer.address);

  const addrs = JSON.parse(fs.readFileSync('.proxy-addresses.json', 'utf8'));

  // Invoice already upgraded, do the rest one by one
  const upgrades = [
    { name: "ConfidentialReceipt", proxy: addrs.receiptAddr },
    { name: "InvoiceAnalytics", proxy: addrs.analyticsAddr },
    { name: "ConfidentialEscrow", proxy: addrs.escrowAddr },
    { name: "ConfidentialPaymentSplitter", proxy: addrs.splitterAddr },
  ];

  for (const { name, proxy } of upgrades) {
    console.log(`\nUpgrading ${name} at ${proxy}...`);
    try {
      const Factory = await hre.ethers.getContractFactory(name);
      const upgraded = await hre.upgrades.upgradeProxy(proxy, Factory, {
        unsafeAllow: ["state-variable-immutable", "constructor"],
      });
      await upgraded.waitForDeployment();
      const implAddr = await hre.upgrades.erc1967.getImplementationAddress(proxy);
      console.log(`   ✅ ${name} upgraded! New impl: ${implAddr}`);
    } catch (e) {
      console.log(`   ❌ ${name} failed: ${e.message?.substring(0, 80)}`);
      console.log("   Waiting 20s before next...");
      await new Promise(r => setTimeout(r, 20000));
    }
  }

  // Regenerate ABIs
  const contracts = ['ConfidentialInvoice', 'ConfidentialReceipt', 'ConfidentialEscrow', 'ConfidentialPaymentSplitter', 'InvoiceAnalytics'];
  const abis = {};
  for (const c of contracts) {
    const artifact = JSON.parse(fs.readFileSync(`artifacts/contracts/${c}.sol/${c}.json`, 'utf8'));
    abis[c] = artifact.abi;
  }
  fs.writeFileSync('frontend/src/contracts/abis.ts', 'export const ABIS = ' + JSON.stringify(abis, null, 2) + ' as const;\n');
  console.log("\n✅ Updated frontend ABIs");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
