const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const addrs = JSON.parse(fs.readFileSync('.proxy-addresses.json', 'utf8'));
  console.log("Upgrading ConfidentialInvoice...");
  const Factory = await hre.ethers.getContractFactory("ConfidentialInvoice");
  const upgraded = await hre.upgrades.upgradeProxy(addrs.invoiceAddr, Factory, {
    unsafeAllow: ["state-variable-immutable", "constructor"],
  });
  await upgraded.waitForDeployment();
  const impl = await hre.upgrades.erc1967.getImplementationAddress(addrs.invoiceAddr);
  console.log("✅ New implementation:", impl);

  // Update ABIs
  const contracts = ['ConfidentialInvoice', 'ConfidentialReceipt', 'ConfidentialEscrow', 'ConfidentialPaymentSplitter', 'InvoiceAnalytics'];
  const abis = {};
  for (const c of contracts) {
    abis[c] = JSON.parse(fs.readFileSync(`artifacts/contracts/${c}.sol/${c}.json`, 'utf8')).abi;
  }
  fs.writeFileSync('frontend/src/contracts/abis.ts', 'export const ABIS = ' + JSON.stringify(abis, null, 2) + ' as const;\n');
  console.log("✅ ABIs updated");
}

main().catch(e => { console.error(e.message); process.exit(1); });
