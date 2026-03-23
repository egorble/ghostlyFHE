const fs = require("fs");
require("dotenv").config();
const { ethers } = require("ethers");
const addrs = JSON.parse(fs.readFileSync(".proxy-addresses.json", "utf8"));

async function main() {
  const { cofhejs, FheTypes } = require("cofhejs/node");

  const provider = new ethers.JsonRpcProvider("https://sepolia.drpc.org");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log("Signer:", wallet.address);

  console.log("Initializing cofhejs...");
  const initResult = await cofhejs.initializeWithEthers({
    ethersProvider: provider,
    ethersSigner: wallet,
    environment: "TESTNET",
  });
  console.log("Init:", initResult.success ? "OK" : JSON.stringify(initResult.error));

  if (!initResult.success) {
    console.log("Cannot proceed without init");
    return;
  }

  // Create permit
  console.log("Creating permit...");
  const permitResult = await cofhejs.createPermit({ type: "self", issuer: wallet.address });
  console.log("Permit:", permitResult.success ? "OK" : JSON.stringify(permitResult.error));

  const abi = JSON.parse(fs.readFileSync("artifacts/contracts/ConfidentialInvoice.sol/ConfidentialInvoice.json", "utf8")).abi;
  const Invoice = new ethers.Contract(addrs.invoiceAddr, abi, wallet);
  const count = Number(await Invoice.nextInvoiceId());
  console.log("Total invoices:", count);

  for (let i = 0; i < count; i++) {
    try {
      const totals = await Invoice.getEncryptedTotals(i);
      const handle = totals[0];

      const result = await cofhejs.unseal(handle, FheTypes.Uint128);
      if (result.success) {
        console.log(`  #${i} subtotal: ${result.data} ✅`);
      } else {
        console.log(`  #${i} FAILED: ${result.error?.message?.substring(0, 80) || JSON.stringify(result.error).substring(0, 80)}`);
      }
    } catch (e) {
      console.log(`  #${i} ERROR: ${e.message?.substring(0, 80)}`);
    }
  }
}

main().catch(e => console.error("Fatal:", e.message));
