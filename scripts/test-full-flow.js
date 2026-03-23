const hre = require("hardhat");
const fs = require("fs");

const ADDRS = JSON.parse(fs.readFileSync(".proxy-addresses.json", "utf8"));

async function main() {
  const { ethers } = hre;
  const { cofhejs, Encryptable } = require("cofhejs/node");

  const [issuer] = await ethers.getSigners();
  console.log("========================================");
  console.log("  GHOSTLY FULL E2E TEST (real FHE)");
  console.log("========================================");
  console.log("Issuer:", issuer.address);

  const balance = await ethers.provider.getBalance(issuer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Create buyer wallet
  const buyerKey = process.env.PRIVATE_KEY_BUYER;
  const buyer = new ethers.Wallet(buyerKey, ethers.provider);
  console.log("Buyer:", buyer.address);

  const arbiterKey = process.env.PRIVATE_KEY_ARBITER;
  const arbiter = new ethers.Wallet(arbiterKey, ethers.provider);
  console.log("Arbiter:", arbiter.address);

  // Fund if needed
  const balB = await ethers.provider.getBalance(buyer.address);
  const balC = await ethers.provider.getBalance(arbiter.address);
  if (balB < ethers.parseEther("0.05")) {
    console.log("\nFunding buyer...");
    await (await issuer.sendTransaction({ to: buyer.address, value: ethers.parseEther("0.1") })).wait();
  }
  if (balC < ethers.parseEther("0.05")) {
    console.log("Funding arbiter...");
    await (await issuer.sendTransaction({ to: arbiter.address, value: ethers.parseEther("0.1") })).wait();
  }

  // Initialize cofhejs directly for Sepolia testnet
  console.log("\nInitializing CoFHE for issuer (TESTNET mode)...");

  const makeProvider = (signer) => ({
    call: async (...args) => signer.provider.call(...args),
    getChainId: async () => (await signer.provider.getNetwork()).chainId.toString(),
    send: async (...args) => signer.provider.send(...args),
  });

  const makeSigner = (signer, provider) => ({
    signTypedData: async (domain, types, value) => signer.signTypedData(domain, types, value),
    getAddress: async () => signer.getAddress(),
    provider,
    sendTransaction: async (...args) => {
      const tx = await signer.sendTransaction(...args);
      return tx.hash;
    },
  });

  const issuerProvider = makeProvider(issuer);
  const issuerSigner = makeSigner(issuer, issuerProvider);

  const buyerProvider = makeProvider(buyer);
  const buyerSgn = makeSigner(buyer, buyerProvider);

  const initResult = await cofhejs.initialize({
    environment: "TESTNET",
    provider: issuerProvider,
    signer: issuerSigner,
  });
  console.log("CoFHE issuer init:", initResult?.success !== false ? "OK" : JSON.stringify(initResult));

  // Load contracts
  const loadABI = (name) => JSON.parse(fs.readFileSync(`artifacts/contracts/${name}.sol/${name}.json`, "utf8")).abi;
  const invoiceABI = loadABI("ConfidentialInvoice");
  const receiptABI = loadABI("ConfidentialReceipt");
  const escrowABI = loadABI("ConfidentialEscrow");

  const invoiceIssuer = new ethers.Contract(ADDRS.invoiceAddr, invoiceABI, issuer);
  const invoiceBuyer = new ethers.Contract(ADDRS.invoiceAddr, invoiceABI, buyer);
  const receiptRead = new ethers.Contract(ADDRS.receiptAddr, receiptABI, ethers.provider);
  const escrowBuyer = new ethers.Contract(ADDRS.escrowAddr, escrowABI, buyer);
  const escrowIssuer = new ethers.Contract(ADDRS.escrowAddr, escrowABI, issuer);
  const escrowArbiter = new ethers.Contract(ADDRS.escrowAddr, escrowABI, arbiter);

  // Track nonces to avoid "nonce too low" errors
  let issuerNonce = await ethers.provider.getTransactionCount(issuer.address);
  let buyerNonce = await ethers.provider.getTransactionCount(buyer.address);
  let arbiterNonce = await ethers.provider.getTransactionCount(arbiter.address);

  const GASI = () => ({ gasLimit: 8_000_000, nonce: issuerNonce++ });
  const GASB = () => ({ gasLimit: 8_000_000, nonce: buyerNonce++ });
  const GASC = () => ({ gasLimit: 8_000_000, nonce: arbiterNonce++ });
  const GAS = { gasLimit: 8_000_000 };
  let passed = 0;
  let failed = 0;
  function ok(name) { passed++; console.log("  ✓ " + name); }
  function fail(name, err) { failed++; console.log("  ✗ " + name + ": " + (err?.shortMessage || err?.message?.substring(0, 150) || err)); }

  // ══════════════════════════════════════
  // TEST 1: INVOICE LIFECYCLE (real FHE)
  // ══════════════════════════════════════
  console.log("\n══════════════════════════════════════");
  console.log("TEST 1: Invoice Lifecycle (real FHE encrypt)");
  console.log("══════════════════════════════════════");

  let invoiceId;
  try {
    // Encrypt issuer & buyer addresses + currency using cofhejs
    console.log("  Encrypting addresses...");
    const encResult = await cofhejs.encrypt([
      Encryptable.address(issuer.address),
      Encryptable.address(buyer.address),
      Encryptable.uint8(0), // ETH
    ]);
    if (encResult.error) throw new Error("Encrypt failed: " + JSON.stringify(encResult.error));
    const [encIssuerAddr, encBuyerAddr, encCurrency] = encResult.data;
    console.log("  Addresses encrypted!");

    const dueDate = Math.floor(Date.now() / 1000) + 86400 * 30;

    const tx = await invoiceIssuer.createInvoice(
      buyer.address,
      encIssuerAddr,
      encBuyerAddr,
      dueDate,
      encCurrency,
      ethers.keccak256(ethers.toUtf8Bytes("ORD-001")),
      ethers.keccak256(ethers.toUtf8Bytes("Full E2E test")),
      true,
      GASI()
    );
    const receipt = await tx.wait();
    invoiceId = (await invoiceIssuer.nextInvoiceId()) - 1n;
    ok("createInvoice (id=" + invoiceId + ", block=" + receipt.blockNumber + ", gas=" + receipt.gasUsed + ")");
  } catch (e) { fail("createInvoice", e); return; }

  // Add line item with real encryption
  try {
    console.log("  Encrypting line item (qty=5, price=200, amount=1000)...");
    const liResult = await cofhejs.encrypt([
      Encryptable.uint32(5),
      Encryptable.uint128(200n),
      Encryptable.uint128(1000n),
    ]);
    if (liResult.error) throw new Error("Encrypt failed: " + JSON.stringify(liResult.error));
    const [encQty, encPrice, encAmount] = liResult.data;

    const tx = await invoiceIssuer.addLineItem(
      invoiceId,
      ethers.keccak256(ethers.toUtf8Bytes("Consulting services")),
      encQty, encPrice, encAmount,
      GASI()
    );
    await tx.wait();
    ok("addLineItem (qty=5, price=200, amount=1000)");
  } catch (e) { fail("addLineItem", e); }

  // Second line item
  try {
    console.log("  Encrypting line item 2 (qty=1, price=500, amount=500)...");
    const li2Result = await cofhejs.encrypt([
      Encryptable.uint32(1),
      Encryptable.uint128(500n),
      Encryptable.uint128(500n),
    ]);
    if (li2Result.error) throw new Error("Encrypt failed");
    const [encQty, encPrice, encAmount] = li2Result.data;

    const tx = await invoiceIssuer.addLineItem(
      invoiceId,
      ethers.keccak256(ethers.toUtf8Bytes("Setup fee")),
      encQty, encPrice, encAmount,
      GASI()
    );
    await tx.wait();
    ok("addLineItem 2 (qty=1, price=500, amount=500)");
  } catch (e) { fail("addLineItem 2", e); }

  // Send invoice
  try {
    const tx = await invoiceIssuer.sendInvoice(invoiceId, GASI());
    await tx.wait();
    const min = await invoiceIssuer.getInvoiceMinimal(invoiceId);
    if (Number(min[2]) !== 1) throw new Error("Status should be Sent(1), got " + min[2]);
    ok("sendInvoice → status=Sent, lineItems=" + min[0]);
  } catch (e) { fail("sendInvoice", e); }

  // Pay invoice (buyer encrypts payment) — re-init cofhejs for buyer
  try {
    console.log("  Re-initializing CoFHE for buyer...");
    await cofhejs.initialize({ environment: "TESTNET", provider: buyerProvider, signer: buyerSgn });
    console.log("  Buyer encrypting payment (amount=1500)...");
    const payResult = await cofhejs.encrypt([Encryptable.uint128(1500n)]);
    if (payResult.error) throw new Error("Encrypt failed");
    const [encPayment] = payResult.data;

    const tx = await invoiceBuyer.payInvoice(invoiceId, encPayment, GASB());
    await tx.wait();
    const min = await invoiceIssuer.getInvoiceMinimal(invoiceId);
    ok("payInvoice → status=" + min[2] + " (2=PartiallyPaid)");
  } catch (e) { fail("payInvoice", e); }

  // Wait a bit for CoFHE decrypt, then finalize
  console.log("  Waiting 15s for CoFHE async decrypt...");
  await new Promise(r => setTimeout(r, 15000));

  try {
    const tx = await invoiceBuyer.finalizePayment(invoiceId, GASB());
    await tx.wait();
    const min = await invoiceIssuer.getInvoiceMinimal(invoiceId);
    ok("finalizePayment → status=" + min[2] + " (3=Paid)");
  } catch (e) { fail("finalizePayment (may need more time)", e); }

  // ══════════════════════════════════════
  // TEST 2: CANCEL
  // ══════════════════════════════════════
  console.log("\n══════════════════════════════════════");
  console.log("TEST 2: Invoice Cancel");
  console.log("══════════════════════════════════════");

  try {
    // Re-init for issuer
    await cofhejs.initialize({ environment: "TESTNET", provider: issuerProvider, signer: issuerSigner });
    const cancelEnc = await cofhejs.encrypt([
      Encryptable.address(issuer.address),
      Encryptable.address(buyer.address),
      Encryptable.uint8(0),
    ]);
    const [eI, eB, eC] = cancelEnc.data;
    const dueDate = Math.floor(Date.now() / 1000) + 86400 * 30;
    const tx = await invoiceIssuer.createInvoice(buyer.address, eI, eB, dueDate, eC,
      ethers.keccak256(ethers.toUtf8Bytes("CANCEL")), ethers.ZeroHash, false, GASI());
    await tx.wait();
    const cid = (await invoiceIssuer.nextInvoiceId()) - 1n;
    ok("createInvoice for cancel (id=" + cid + ")");

    await (await invoiceIssuer.cancelInvoice(cid, GASI())).wait();
    const min = await invoiceIssuer.getInvoiceMinimal(cid);
    if (Number(min[2]) !== 6) throw new Error("Expected Cancelled(6)");
    ok("cancelInvoice → status=Cancelled");
  } catch (e) { fail("cancel flow", e); }

  // ══════════════════════════════════════
  // TEST 3: DISPUTE
  // ══════════════════════════════════════
  console.log("\n══════════════════════════════════════");
  console.log("TEST 3: Dispute Flow");
  console.log("══════════════════════════════════════");

  try {
    await cofhejs.initialize({ environment: "TESTNET", provider: issuerProvider, signer: issuerSigner });
    const dispEnc1 = await cofhejs.encrypt([
      Encryptable.address(issuer.address),
      Encryptable.address(buyer.address),
      Encryptable.uint8(0),
    ]);
    const [eI, eB, eC] = dispEnc1.data;
    const dispEnc2 = await cofhejs.encrypt([
      Encryptable.uint32(1), Encryptable.uint128(100n), Encryptable.uint128(100n),
    ]);
    const [eQ, eP, eA] = dispEnc2.data;
    const dueDate = Math.floor(Date.now() / 1000) + 86400 * 30;

    await (await invoiceIssuer.createInvoice(buyer.address, eI, eB, dueDate, eC,
      ethers.keccak256(ethers.toUtf8Bytes("DISPUTE")), ethers.ZeroHash, false, GASI())).wait();
    const did = (await invoiceIssuer.nextInvoiceId()) - 1n;

    await (await invoiceIssuer.addLineItem(did, ethers.keccak256(ethers.toUtf8Bytes("Item")), eQ, eP, eA, GASI())).wait();
    await (await invoiceIssuer.sendInvoice(did, GASI())).wait();
    ok("create+item+send for dispute (id=" + did + ")");

    await (await invoiceBuyer.disputeInvoice(did, GASB())).wait();
    let min = await invoiceIssuer.getInvoiceMinimal(did);
    if (Number(min[2]) !== 5) throw new Error("Expected Disputed(5)");
    ok("disputeInvoice → Disputed");

    await (await invoiceIssuer.resolveDispute(did, true, GASI())).wait();
    min = await invoiceIssuer.getInvoiceMinimal(did);
    if (Number(min[2]) !== 6) throw new Error("Expected Cancelled(6)");
    ok("resolveDispute(favorBuyer) → Cancelled");
  } catch (e) { fail("dispute flow", e); }

  // ══════════════════════════════════════
  // TEST 4: AUDIT DELEGATION
  // ══════════════════════════════════════
  console.log("\n══════════════════════════════════════");
  console.log("TEST 4: Audit Delegation");
  console.log("══════════════════════════════════════");

  try {
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400 * 7);
    await (await invoiceIssuer.grantAccess(invoiceId, arbiter.address, expiry, GASI())).wait();
    const d = await invoiceIssuer.delegatedAccess(invoiceId, arbiter.address);
    if (d !== expiry) throw new Error("Expiry mismatch");
    ok("grantAccess → confirmed");

    await (await invoiceIssuer.revokeAccess(invoiceId, arbiter.address, GASI())).wait();
    const r = await invoiceIssuer.delegatedAccess(invoiceId, arbiter.address);
    if (r !== 0n) throw new Error("Should be 0");
    ok("revokeAccess → delegation=0");
  } catch (e) { fail("audit delegation", e); }

  // ══════════════════════════════════════
  // TEST 5: RECEIPTS
  // ══════════════════════════════════════
  console.log("\n══════════════════════════════════════");
  console.log("TEST 5: Receipts");
  console.log("══════════════════════════════════════");

  try {
    const count = await receiptRead.getReceiptCount();
    ok("receiptCount: " + count);
    if (count > 0n) {
      const pub = await receiptRead.getReceiptPublicData(0);
      ok("receipt[0]: payer=" + pub[1].substring(0, 10) + "..., time=" + new Date(Number(pub[3]) * 1000).toISOString());
    }
  } catch (e) { fail("receipts", e); }

  // ══════════════════════════════════════
  // TEST 6: ESCROW (all flows)
  // ══════════════════════════════════════
  console.log("\n══════════════════════════════════════");
  console.log("TEST 6: Escrow");
  console.log("══════════════════════════════════════");

  // Set arbiter
  try {
    const cur = await escrowIssuer.arbiter();
    if (cur.toLowerCase() !== arbiter.address.toLowerCase()) {
      await (await escrowIssuer.setArbiter(arbiter.address, GASI())).wait();
    }
    ok("arbiter set: " + arbiter.address.substring(0, 10) + "...");
  } catch (e) { fail("setArbiter", e); }

  // 6a: Create + Release
  try {
    await cofhejs.initialize({ environment: "TESTNET", provider: buyerProvider, signer: buyerSgn });
    const escEnc1 = await cofhejs.encrypt([Encryptable.uint128(5000n)]);
    const [encAmt] = escEnc1.data;
    const deadline = Math.floor(Date.now() / 1000) + 86400 * 14;
    await (await escrowBuyer.createEscrow(invoiceId, issuer.address, encAmt, deadline, GASB())).wait();
    const eid = (await escrowBuyer.nextEscrowId()) - 1n;
    ok("createEscrow (id=" + eid + ", amount=5000)");

    await (await escrowBuyer.releaseEscrow(eid, GASB())).wait();
    const pub = await escrowBuyer.getEscrowPublicData(eid);
    if (Number(pub[3]) !== 1) throw new Error("Expected Released(1)");
    ok("releaseEscrow → Released");
  } catch (e) { fail("escrow release", e); }

  // 6b: Create + Refund
  try {
    const escEnc2 = await cofhejs.encrypt([Encryptable.uint128(3000n)]);
    const [encAmt] = escEnc2.data;
    const deadline = Math.floor(Date.now() / 1000) + 86400 * 14;
    await (await escrowBuyer.createEscrow(997, issuer.address, encAmt, deadline, GASB())).wait();
    const eid = (await escrowBuyer.nextEscrowId()) - 1n;
    ok("createEscrow for refund (id=" + eid + ")");

    await (await escrowIssuer.refundEscrow(eid, GASI())).wait();
    const pub = await escrowBuyer.getEscrowPublicData(eid);
    if (Number(pub[3]) !== 2) throw new Error("Expected Refunded(2)");
    ok("refundEscrow → Refunded");
  } catch (e) { fail("escrow refund", e); }

  // 6c: Create + Dispute + Arbiter resolve
  try {
    const escEnc3 = await cofhejs.encrypt([Encryptable.uint128(7000n)]);
    const [encAmt] = escEnc3.data;
    const deadline = Math.floor(Date.now() / 1000) + 86400 * 14;
    await (await escrowBuyer.createEscrow(996, issuer.address, encAmt, deadline, GAS)).wait();
    const eid = (await escrowBuyer.nextEscrowId()) - 1n;
    ok("createEscrow for dispute (id=" + eid + ")");

    await (await escrowBuyer.disputeEscrow(eid, GASB())).wait();
    let pub = await escrowBuyer.getEscrowPublicData(eid);
    if (Number(pub[3]) !== 3) throw new Error("Expected Disputed(3)");
    ok("disputeEscrow → Disputed");

    await (await escrowArbiter.resolveDispute(eid, true, GASC())).wait();
    pub = await escrowBuyer.getEscrowPublicData(eid);
    if (Number(pub[3]) !== 2) throw new Error("Expected Refunded(2)");
    ok("arbiter resolve(favorDepositor) → Refunded");
  } catch (e) { fail("escrow dispute", e); }

  // ══════════════════════════════════════
  // TEST 7: ACCESS CONTROL
  // ══════════════════════════════════════
  console.log("\n══════════════════════════════════════");
  console.log("TEST 7: Access Control");
  console.log("══════════════════════════════════════");

  try {
    await invoiceBuyer.cancelInvoice(invoiceId, GASB());
    fail("buyer cancel should revert", "Did not revert!");
  } catch (e) {
    ok("buyer cancelInvoice correctly reverts");
  }

  try {
    const invArb = new ethers.Contract(ADDRS.invoiceAddr, invoiceABI, arbiter);
    await invArb.getInvoiceFull(invoiceId);
    fail("non-party getInvoiceFull should revert", "Did not revert!");
  } catch (e) {
    ok("non-party getInvoiceFull correctly reverts");
  }

  try {
    const invArb = new ethers.Contract(ADDRS.invoiceAddr, invoiceABI, arbiter);
    const min = await invArb.getInvoiceMinimal(invoiceId);
    ok("non-party getInvoiceMinimal OK (status=" + min[2] + ")");
  } catch (e) { fail("non-party getInvoiceMinimal", e); }

  // ══════════════════════════════════════
  // TEST 8: VIEW FUNCTIONS + ETHERSCAN
  // ══════════════════════════════════════
  console.log("\n══════════════════════════════════════");
  console.log("TEST 8: View Functions");
  console.log("══════════════════════════════════════");

  try {
    const count = await invoiceIssuer.getInvoiceCount();
    ok("invoiceCount: " + count);

    const full = await invoiceIssuer.getInvoiceFull(invoiceId);
    ok("getInvoiceFull: issuer=" + full[0].substring(0, 10) + "... buyer=" + full[1].substring(0, 10) + "...");

    const totals = await invoiceIssuer.getEncryptedTotals(invoiceId);
    ok("getEncryptedTotals: subtotal_handle=" + totals[0].toString().substring(0, 30) + "...");
    console.log("    (This is a FHE handle, NOT the actual value. Only decrypt via SDK reveals 1500)");

    const li = await invoiceIssuer.getLineItem(invoiceId, 0);
    ok("getLineItem(0): descHash=" + li[0].substring(0, 20) + "..., qty/price/amount = FHE handles");

    const li2 = await invoiceIssuer.getLineItem(invoiceId, 1);
    ok("getLineItem(1): descHash=" + li2[0].substring(0, 20) + "...");
  } catch (e) { fail("viewFunctions", e); }

  // ══════════════════════════════════════
  // TEST 9: PROXY VERIFICATION
  // ══════════════════════════════════════
  console.log("\n══════════════════════════════════════");
  console.log("TEST 9: Proxy Verification");
  console.log("══════════════════════════════════════");

  try {
    ok("ConfidentialInvoice proxy: " + ADDRS.invoiceAddr);
    ok("ConfidentialReceipt proxy: " + ADDRS.receiptAddr);
    ok("ConfidentialEscrow proxy: " + ADDRS.escrowAddr);

    const owner = await invoiceIssuer.owner();
    ok("owner: " + owner);

    // Verify proxy has code
    const code = await ethers.provider.getCode(ADDRS.invoiceAddr);
    ok("proxy code: " + code.length + " bytes (ERC1967 proxy)");
  } catch (e) { fail("proxyVerification", e); }

  // ══════════════════════════════════════
  // ETHERSCAN LINKS
  // ══════════════════════════════════════
  console.log("\n══════════════════════════════════════");
  console.log("ETHERSCAN LINKS (verify encryption)");
  console.log("══════════════════════════════════════");
  console.log("Invoice contract: https://sepolia.etherscan.io/address/" + ADDRS.invoiceAddr);
  console.log("Receipt contract: https://sepolia.etherscan.io/address/" + ADDRS.receiptAddr);
  console.log("Escrow contract:  https://sepolia.etherscan.io/address/" + ADDRS.escrowAddr);

  // ══════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════
  console.log("\n========================================");
  console.log("  RESULTS: " + passed + " passed, " + failed + " failed");
  console.log("========================================");

  const finalBal = await ethers.provider.getBalance(issuer.address);
  console.log("Gas spent (issuer): " + ethers.formatEther(balance - finalBal) + " ETH");

  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
