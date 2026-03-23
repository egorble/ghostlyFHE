const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  // 1. Deploy ConfidentialReceipt
  console.log("\n1. Deploying ConfidentialReceipt...");
  const Receipt = await hre.ethers.getContractFactory("ConfidentialReceipt");
  const receipt = await Receipt.deploy();
  await receipt.waitForDeployment();
  const receiptAddr = await receipt.getAddress();
  console.log("   ConfidentialReceipt:", receiptAddr);

  // 2. Deploy InvoiceAnalytics
  console.log("2. Deploying InvoiceAnalytics...");
  const Analytics = await hre.ethers.getContractFactory("InvoiceAnalytics");
  const analytics = await Analytics.deploy();
  await analytics.waitForDeployment();
  const analyticsAddr = await analytics.getAddress();
  console.log("   InvoiceAnalytics:", analyticsAddr);

  // 3. Deploy ConfidentialInvoice
  console.log("3. Deploying ConfidentialInvoice...");
  const Invoice = await hre.ethers.getContractFactory("ConfidentialInvoice");
  const invoice = await Invoice.deploy();
  await invoice.waitForDeployment();
  const invoiceAddr = await invoice.getAddress();
  console.log("   ConfidentialInvoice:", invoiceAddr);

  // 4. Wire: Invoice -> Receipt + Analytics
  console.log("4. Wiring Invoice -> Receipt...");
  const tx1 = await invoice.setReceiptContract(receiptAddr);
  await tx1.wait();

  console.log("5. Wiring Invoice -> Analytics...");
  const tx2 = await invoice.setAnalyticsContract(analyticsAddr);
  await tx2.wait();

  // 6. Wire: Receipt + Analytics -> Invoice
  console.log("   Wiring Receipt -> Invoice...");
  const tx3 = await receipt.setInvoiceContract(invoiceAddr);
  await tx3.wait();

  console.log("   Wiring Analytics -> Invoice...");
  const tx4 = await analytics.setInvoiceContract(invoiceAddr);
  await tx4.wait();

  // 6. Deploy ConfidentialEscrow
  console.log("6. Deploying ConfidentialEscrow...");
  const Escrow = await hre.ethers.getContractFactory("ConfidentialEscrow");
  const escrow = await Escrow.deploy(deployer.address);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log("   ConfidentialEscrow:", escrowAddr);

  // 7. Deploy ConfidentialPaymentSplitter
  console.log("7. Deploying ConfidentialPaymentSplitter...");
  const Splitter = await hre.ethers.getContractFactory("ConfidentialPaymentSplitter");
  const splitter = await Splitter.deploy();
  await splitter.waitForDeployment();
  const splitterAddr = await splitter.getAddress();
  console.log("   ConfidentialPaymentSplitter:", splitterAddr);

  console.log("\n========================================");
  console.log("  DEPLOYED ADDRESSES");
  console.log("========================================");
  console.log("ConfidentialInvoice:", invoiceAddr);
  console.log("ConfidentialReceipt:", receiptAddr);
  console.log("InvoiceAnalytics:", analyticsAddr);
  console.log("ConfidentialEscrow:", escrowAddr);
  console.log("ConfidentialPaymentSplitter:", splitterAddr);

  // Update frontend addresses
  const fs = require("fs");
  const addressFile = `export const ADDRESSES = {
  ConfidentialInvoice: '${invoiceAddr}',
  ConfidentialReceipt: '${receiptAddr}',
  InvoiceAnalytics: '${analyticsAddr}',
  ConfidentialEscrow: '${escrowAddr}',
  ConfidentialPaymentSplitter: '${splitterAddr}',
  USDC_SEPOLIA: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
} as const;

export const CONTRACT_ADDRESSES = ADDRESSES;
`;
  fs.writeFileSync("frontend/src/contracts/addresses.ts", addressFile);
  console.log("\nUpdated frontend/src/contracts/addresses.ts");

  // Regenerate ABIs
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
