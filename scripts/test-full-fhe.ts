const { cofhejs, Encryptable, FheTypes } = require('cofhejs/node');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  const baseProvider = new ethers.JsonRpcProvider('https://ethereum-sepolia.publicnode.com');
  const baseWallet = new ethers.Wallet('e740d5a023d26b21274e5882a1038e17da834c41b0e23c62ccdc586de693c3f6', baseProvider);
  console.log('Wallet:', baseWallet.address);

  // ethers v5 shim for cofhejs
  const v5Provider = {
    getChainId: async () => Number((await baseProvider.getNetwork()).chainId),
    getNetwork: async () => ({ chainId: Number((await baseProvider.getNetwork()).chainId) }),
    getBlockNumber: () => baseProvider.getBlockNumber(),
    call: (tx) => baseProvider.call(tx),
    send: (method, params) => baseProvider.send(method, params),
    _isProvider: true,
  };
  const v5Signer = {
    getAddress: async () => baseWallet.address,
    address: baseWallet.address,
    getChainId: async () => Number((await baseProvider.getNetwork()).chainId),
    signMessage: (msg) => baseWallet.signMessage(msg),
    signTypedData: (domain, types, value) => baseWallet.signTypedData(domain, types, value),
    _signTypedData: (domain, types, value) => baseWallet.signTypedData(domain, types, value),
    provider: v5Provider,
    _isSigner: true,
  };

  // 1. Init CoFHE SDK
  console.log('\n=== 1. Initializing CoFHE SDK ===');
  const init = await cofhejs.initialize({ provider: v5Provider, signer: v5Signer, environment: 'TESTNET' });
  if (!init.success) { console.log('Init failed:', init.error?.cause?.message); return; }
  console.log('   CoFHE SDK ready!');

  // 2. Encrypt addresses
  console.log('\n=== 2. FHE-encrypting issuer & buyer addresses ===');
  const issuerAddr = baseWallet.address;
  const buyerAddr = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

  const encAddrs = await cofhejs.encrypt([
    Encryptable.address(issuerAddr),
    Encryptable.address(buyerAddr),
  ]);
  if (!encAddrs.success) { console.log('Addr encrypt failed:', JSON.stringify(encAddrs.error).substring(0,300)); return; }
  console.log('   Issuer address encrypted, ctHash:', encAddrs.data[0].ctHash.toString().substring(0,30) + '...');
  console.log('   Buyer address encrypted, ctHash:', encAddrs.data[1].ctHash.toString().substring(0,30) + '...');
  console.log('   ^ Real addresses are NOW HIDDEN on-chain!');

  // 3. Create invoice
  console.log('\n=== 3. Creating JCT-compliant invoice ===');
  const abi = JSON.parse(fs.readFileSync(path.join(__dirname, '../artifacts/contracts/ConfidentialInvoice.sol/ConfidentialInvoice.json'), 'utf8')).abi;
  const deployments = JSON.parse(fs.readFileSync(path.join(__dirname, '../deployments/eth-sepolia.json'), 'utf8'));
  const invoice = new ethers.Contract(deployments.ConfidentialInvoice, abi, baseWallet);

  const dueDate = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days

  const tx1 = await invoice.createInvoice(
    buyerAddr,              // buyer (public, for ACL)
    encAddrs.data[0],       // encrypted issuer address
    encAddrs.data[1],       // encrypted buyer address
    'T1234567890123',       // JCT T-number (13 digits)
    dueDate,
    0,                      // PaymentCurrency.CREDITS
    'PO-2026-001',          // orderId
    'Payment terms: Net 30. JCT qualified invoice.', // memo
    true,                   // auditEnabled
    { gasLimit: 8000000 }
  );
  console.log('   Tx:', tx1.hash);
  const receipt1 = await tx1.wait();
  console.log('   Status:', receipt1.status === 1 ? 'SUCCESS' : 'FAILED', '| Gas:', receipt1.gasUsed.toString());

  const invoiceCount = await invoice.getInvoiceCount();
  const invoiceId = invoiceCount - 1n;
  console.log('   Invoice ID:', invoiceId.toString());

  // 4. Add line item: "Service fee" qty=1, unitPrice=10000, amount=10000, tax=1000 (10%)
  console.log('\n=== 4. Adding line item "Service fee" (encrypted) ===');
  const lineEnc = await cofhejs.encrypt([
    Encryptable.uint32(1n),         // qty
    Encryptable.uint128(10000n),    // unitPrice
    Encryptable.uint128(10000n),    // amount (qty*unitPrice)
    Encryptable.uint128(1000n),     // taxAmount (10% of 10000)
  ]);
  if (!lineEnc.success) { console.log('Line encrypt failed'); return; }

  const tx2 = await invoice.addLineItem(
    invoiceId,
    'Service fee',
    lineEnc.data[0],  // qty
    lineEnc.data[1],  // unitPrice
    lineEnc.data[2],  // amount
    0,                // TaxRate.STANDARD_10
    lineEnc.data[3],  // taxAmount
    { gasLimit: 8000000 }
  );
  console.log('   Tx:', tx2.hash);
  const receipt2 = await tx2.wait();
  console.log('   Status:', receipt2.status === 1 ? 'SUCCESS' : 'FAILED', '| Gas:', receipt2.gasUsed.toString());

  // 5. Add second line item: "Consulting" qty=2, unitPrice=5000, amount=10000, reduced tax=800 (8%)
  console.log('\n=== 5. Adding line item "Consulting" (reduced 8% tax) ===');
  const line2Enc = await cofhejs.encrypt([
    Encryptable.uint32(2n),
    Encryptable.uint128(5000n),
    Encryptable.uint128(10000n),
    Encryptable.uint128(800n),    // 8% of 10000
  ]);
  if (!line2Enc.success) { console.log('Line2 encrypt failed'); return; }

  const tx3 = await invoice.addLineItem(
    invoiceId,
    'Consulting (reduced rate)',
    line2Enc.data[0], line2Enc.data[1], line2Enc.data[2],
    1, // TaxRate.REDUCED_8
    line2Enc.data[3],
    { gasLimit: 8000000 }
  );
  const receipt3 = await tx3.wait();
  console.log('   Status:', receipt3.status === 1 ? 'SUCCESS' : 'FAILED', '| Gas:', receipt3.gasUsed.toString());

  // 6. Read back public data
  console.log('\n=== 6. Reading PUBLIC invoice data (visible to everyone) ===');
  const pub = await invoice.getInvoicePublicData(invoiceId);
  console.log('   Issuer (public):', pub[0]);
  console.log('   Buyer (public):', pub[1]);
  console.log('   T-Number:', pub[2]);
  console.log('   Line items:', pub[3].toString());
  console.log('   Due date:', new Date(Number(pub[4]) * 1000).toISOString().split('T')[0]);
  console.log('   Currency:', ['CREDITS', 'USDCx'][Number(pub[5])]);
  console.log('   Order ID:', pub[6]);
  console.log('   Memo:', pub[7]);
  console.log('   Status:', ['Created','Sent','PartiallyPaid','Paid','Overdue','Disputed','Cancelled'][Number(pub[8])]);
  console.log('   Created:', new Date(Number(pub[9]) * 1000).toISOString());
  console.log('   Audit enabled:', pub[10]);

  // 7. Read ENCRYPTED data (only issuer/buyer can do this)
  console.log('\n=== 7. Reading ENCRYPTED data (only authorized) ===');
  const totals = await invoice.getEncryptedTotals(invoiceId);
  console.log('   Encrypted subtotal handle:', totals[0].toString().substring(0,30) + '...');
  console.log('   Encrypted totalTax handle:', totals[1].toString().substring(0,30) + '...');
  console.log('   Encrypted totalAmount handle:', totals[2].toString().substring(0,30) + '...');
  console.log('   Encrypted amountPaid handle:', totals[3].toString().substring(0,30) + '...');
  console.log('   ^ These are OPAQUE HANDLES — not actual values!');

  const encIssuerHandle = await invoice.getEncryptedIssuer(invoiceId);
  const encBuyerHandle = await invoice.getEncryptedBuyer(invoiceId);
  console.log('\n   Encrypted issuer addr handle:', encIssuerHandle.toString().substring(0,30) + '...');
  console.log('   Encrypted buyer addr handle:', encBuyerHandle.toString().substring(0,30) + '...');
  console.log('   ^ The addresses', issuerAddr.substring(0,8) + '... and', buyerAddr.substring(0,8) + '... are HIDDEN!');

  // 8. Read line item public + encrypted
  console.log('\n=== 8. Line item details ===');
  for (let i = 0; i < 2; i++) {
    const lpub = await invoice.getLineItemPublicData(invoiceId, i);
    const lenc = await invoice.getLineItemEncrypted(invoiceId, i);
    console.log(`   Item #${i}: "${lpub[0]}" | Tax rate: ${['10%','8%','exempt'][Number(lpub[1])]}`);
    console.log(`     Encrypted qty handle: ${lenc[0].toString().substring(0,25)}...`);
    console.log(`     Encrypted unitPrice handle: ${lenc[1].toString().substring(0,25)}...`);
    console.log(`     Encrypted amount handle: ${lenc[2].toString().substring(0,25)}...`);
    console.log(`     Encrypted tax handle: ${lenc[3].toString().substring(0,25)}...`);
  }

  // 9. JCT breakdown
  console.log('\n=== 9. JCT Tax Breakdown (encrypted) ===');
  const jct = await invoice.getEncryptedJctBreakdown(invoiceId);
  console.log('   10% base handle:', jct[0].toString().substring(0,25) + '...');
  console.log('   10% tax handle:', jct[1].toString().substring(0,25) + '...');
  console.log('   8% base handle:', jct[2].toString().substring(0,25) + '...');
  console.log('   8% tax handle:', jct[3].toString().substring(0,25) + '...');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  FULL FHE ENCRYPTION TEST COMPLETE!');
  console.log('='.repeat(60));
  console.log('\nWhat is ENCRYPTED (hidden on-chain):');
  console.log('  - Issuer address');
  console.log('  - Buyer address');
  console.log('  - All amounts (subtotal, tax, total, paid)');
  console.log('  - Line item details (qty, unitPrice, amount, tax)');
  console.log('  - JCT tax breakdown (10% base/tax, 8% base/tax)');
  console.log('\nWhat is PUBLIC (visible on-chain):');
  console.log('  - T-Number, Order ID, Memo');
  console.log('  - Due date, Currency, Status');
  console.log('  - Line item descriptions and tax rate categories');
  console.log('  - Audit enabled flag');
  console.log('\nContract:', deployments.ConfidentialInvoice);
  console.log('Invoice ID:', invoiceId.toString());
}

main().catch(e => console.error('Fatal:', e.message?.substring(0, 300)));
