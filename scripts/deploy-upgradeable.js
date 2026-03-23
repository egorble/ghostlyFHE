const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  // 1. Deploy ConfidentialReceipt (UUPS Proxy)
  console.log("\n1. Deploying ConfidentialReceipt (UUPS Proxy)...");
  const Receipt = await hre.ethers.getContractFactory("ConfidentialReceipt");
  const receipt = await hre.upgrades.deployProxy(Receipt, [], {
    kind: "uups",
    unsafeAllow: ["state-variable-immutable", "constructor"],
  });
  await receipt.waitForDeployment();
  const receiptAddr = await receipt.getAddress();
  console.log("   ConfidentialReceipt proxy:", receiptAddr);

  // 2. Deploy InvoiceAnalytics (UUPS Proxy)
  console.log("2. Deploying InvoiceAnalytics (UUPS Proxy)...");
  const Analytics = await hre.ethers.getContractFactory("InvoiceAnalytics");
  const analytics = await hre.upgrades.deployProxy(Analytics, [], {
    kind: "uups",
    unsafeAllow: ["state-variable-immutable", "constructor"],
  });
  await analytics.waitForDeployment();
  const analyticsAddr = await analytics.getAddress();
  console.log("   InvoiceAnalytics proxy:", analyticsAddr);

  // 3. Deploy ConfidentialInvoice (UUPS Proxy)
  console.log("3. Deploying ConfidentialInvoice (UUPS Proxy)...");
  const Invoice = await hre.ethers.getContractFactory("ConfidentialInvoice");
  const invoice = await hre.upgrades.deployProxy(Invoice, [], {
    kind: "uups",
    unsafeAllow: ["state-variable-immutable", "constructor"],
  });
  await invoice.waitForDeployment();
  const invoiceAddr = await invoice.getAddress();
  console.log("   ConfidentialInvoice proxy:", invoiceAddr);

  // 4. Wire: Invoice -> Receipt + Analytics
  console.log("4. Wiring Invoice -> Receipt...");
  const tx1 = await invoice.setReceiptContract(receiptAddr);
  await tx1.wait();

  console.log("5. Wiring Invoice -> Analytics...");
  const tx2 = await invoice.setAnalyticsContract(analyticsAddr);
  await tx2.wait();

  // 5. Wire: Receipt + Analytics -> Invoice
  console.log("   Wiring Receipt -> Invoice...");
  const tx3 = await receipt.setInvoiceContract(invoiceAddr);
  await tx3.wait();

  console.log("   Wiring Analytics -> Invoice...");
  const tx4 = await analytics.setInvoiceContract(invoiceAddr);
  await tx4.wait();

  // 6. Deploy ConfidentialEscrow (UUPS Proxy)
  console.log("6. Deploying ConfidentialEscrow (UUPS Proxy)...");
  const Escrow = await hre.ethers.getContractFactory("ConfidentialEscrow");
  const escrow = await hre.upgrades.deployProxy(Escrow, [deployer.address], {
    kind: "uups",
    unsafeAllow: ["state-variable-immutable", "constructor"],
  });
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log("   ConfidentialEscrow proxy:", escrowAddr);

  // 7. Deploy ConfidentialPaymentSplitter (UUPS Proxy)
  console.log("7. Deploying ConfidentialPaymentSplitter (UUPS Proxy)...");
  const Splitter = await hre.ethers.getContractFactory("ConfidentialPaymentSplitter");
  const splitter = await hre.upgrades.deployProxy(Splitter, [], {
    kind: "uups",
    unsafeAllow: ["state-variable-immutable", "constructor"],
  });
  await splitter.waitForDeployment();
  const splitterAddr = await splitter.getAddress();
  console.log("   ConfidentialPaymentSplitter proxy:", splitterAddr);

  console.log("\n========================================");
  console.log("  DEPLOYED PROXY ADDRESSES (stable)");
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

  // Save proxy addresses for upgrade script
  const proxyAddresses = { invoiceAddr, receiptAddr, analyticsAddr, escrowAddr, splitterAddr };
  fs.writeFileSync('.proxy-addresses.json', JSON.stringify(proxyAddresses, null, 2));
  console.log("Saved proxy addresses to .proxy-addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
