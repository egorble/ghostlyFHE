require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const addrs = JSON.parse(fs.readFileSync(".proxy-addresses.json", "utf8"));

async function main() {
  const { cofhejs, Encryptable, FheTypes } = require("cofhejs/node");
  const provider = new ethers.JsonRpcProvider("https://sepolia.drpc.org");
  const issuer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const buyer = new ethers.Wallet(process.env.PRIVATE_KEY_BUYER, provider);

  console.log("Issuer:", issuer.address);
  console.log("Buyer:", buyer.address);

  // Init cofhejs
  const initResult = await cofhejs.initializeWithEthers({
    ethersProvider: provider,
    ethersSigner: issuer,
    environment: "TESTNET",
  });
  if (!initResult.success) { console.log("Init failed:", initResult.error); return; }
  await cofhejs.createPermit({ type: "self", issuer: issuer.address });
  console.log("CoFHE initialized");

  const Invoice = new ethers.Contract(addrs.invoiceAddr, JSON.parse(fs.readFileSync("artifacts/contracts/ConfidentialInvoice.sol/ConfidentialInvoice.json","utf8")).abi, issuer);

  // Step 1: Create invoice with encrypted subtotal
  console.log("\n--- Step 1: Encrypt subtotal=999 ---");
  const encResult = await cofhejs.encrypt([Encryptable.uint128(999n), Encryptable.uint8(1n)]);
  if (!encResult.success) { console.log("Encrypt failed:", encResult.error); return; }
  const [encSubtotal, encCurrency] = encResult.data;
  console.log("Encrypted! ctHash:", encSubtotal.ctHash.toString().substring(0, 30) + "...");

  // Step 2: Create invoice
  console.log("\n--- Step 2: Create invoice ---");
  const dueDate = Math.floor(Date.now() / 1000) + 86400 * 30;
  const tx = await Invoice.connect(issuer).createInvoice(
    buyer.address, encSubtotal, encSubtotal, dueDate, encCurrency,
    ethers.keccak256(ethers.toUtf8Bytes("UNSEAL-TEST-" + Date.now())),
    ethers.keccak256(ethers.toUtf8Bytes("")),
    false,
    { gasLimit: 8000000 }
  );
  await tx.wait();
  const invoiceId = Number(await Invoice.nextInvoiceId()) - 1;
  console.log("Created invoice #" + invoiceId);

  // Step 3: Read handle
  const totals = await Invoice.getEncryptedTotals(invoiceId);
  const handle = totals[0];
  console.log("Subtotal handle:", handle.toString().substring(0, 30) + "...");

  // Step 4: Wait then try unseal
  console.log("\n--- Step 3: Try unseal immediately ---");
  let result = await cofhejs.unseal(handle, FheTypes.Uint128);
  console.log("Immediate:", result.success ? "✅ " + result.data : "❌ " + result.error?.message);

  if (!result.success) {
    console.log("\n--- Waiting 30s for CoFHE to process... ---");
    await new Promise(r => setTimeout(r, 30000));
    result = await cofhejs.unseal(handle, FheTypes.Uint128);
    console.log("After 30s:", result.success ? "✅ " + result.data : "❌ " + result.error?.message);
  }

  if (!result.success) {
    console.log("\n--- Waiting 60s more... ---");
    await new Promise(r => setTimeout(r, 60000));
    result = await cofhejs.unseal(handle, FheTypes.Uint128);
    console.log("After 90s:", result.success ? "✅ " + result.data : "❌ " + result.error?.message);
  }

  // Step 5: Also try adding a line item and unsealing the FHE.add result
  if (result.success) {
    console.log("\n--- Step 4: Add line item (qty=2, price=500, amount=999) ---");
    const encLI = await cofhejs.encrypt([
      Encryptable.uint32(2n), Encryptable.uint128(500n), Encryptable.uint128(999n)
    ]);
    if (!encLI.success) { console.log("LI encrypt failed"); return; }
    const [eq, ep, ea] = encLI.data;
    const desc = ethers.keccak256(ethers.toUtf8Bytes("Test item"));
    const tx2 = await Invoice.connect(issuer).addLineItem(invoiceId, desc, eq, ep, ea, { gasLimit: 8000000 });
    await tx2.wait();
    console.log("Line item added");

    // Read new subtotal (should be FHE.add result)
    const newTotals = await Invoice.getEncryptedTotals(invoiceId);
    const newHandle = newTotals[0];
    console.log("New subtotal handle:", newHandle.toString().substring(0, 30) + "...");
    console.log("Handle changed:", handle.toString() !== newHandle.toString());

    console.log("\n--- Unseal new subtotal immediately ---");
    let r2 = await cofhejs.unseal(newHandle, FheTypes.Uint128);
    console.log("Immediate:", r2.success ? "✅ " + r2.data : "❌ " + r2.error?.message);

    if (!r2.success) {
      console.log("Waiting 30s...");
      await new Promise(r => setTimeout(r, 30000));
      r2 = await cofhejs.unseal(newHandle, FheTypes.Uint128);
      console.log("After 30s:", r2.success ? "✅ " + r2.data : "❌ " + r2.error?.message);
    }
  }
}

main().catch(e => console.error("Fatal:", e.message));
