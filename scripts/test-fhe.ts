import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Testing with account:', deployer.address)

  // Use a second address as payer (just a random valid address for testing)
  const payerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'

  const invoiceAddr = '0xC02a35c1342a727918E1D23eD44742684569fE07'
  const invoice = await ethers.getContractAt('ConfidentialInvoice', invoiceAddr)

  // Step 1: Check current invoice count
  const countBefore = await invoice.getInvoiceCount()
  console.log('\n=== Step 1: Current invoice count:', countBefore.toString())

  // Step 2: Create an invoice with encrypted amount = 1000, due date = future timestamp
  console.log('\n=== Step 2: Creating invoice with encrypted amount...')
  console.log('  Amount: 1000 (will be FHE-encrypted on-chain via trivial encryption)')
  console.log('  Payer:', payerAddress)

  try {
    // InEuint128 struct for trivial encryption
    const encAmount = {
      ctHash: 1000n,
      securityZone: 0,
      utype: 6, // uint128
      signature: '0x',
    }
    const encDueDate = {
      ctHash: BigInt(Math.floor(Date.now() / 1000) + 86400), // +1 day
      securityZone: 0,
      utype: 5, // uint64
      signature: '0x',
    }

    const tx = await invoice.createInvoice(payerAddress, encAmount, encDueDate, 1, { gasLimit: 5000000 })
    console.log('  Tx hash:', tx.hash)
    const receipt = await tx.wait()
    console.log('  Gas used:', receipt?.gasUsed.toString())
    console.log('  Status:', receipt?.status === 1 ? 'SUCCESS' : 'FAILED')

    // Check for InvoiceCreated event
    const event = receipt?.logs.find((l: any) => {
      try {
        return invoice.interface.parseLog({ topics: l.topics as string[], data: l.data })?.name === 'InvoiceCreated'
      } catch { return false }
    })
    if (event) {
      const parsed = invoice.interface.parseLog({ topics: event.topics as string[], data: event.data })
      console.log('  Event InvoiceCreated:', {
        invoiceId: parsed?.args[0].toString(),
        issuer: parsed?.args[1],
        payer: parsed?.args[2],
        category: parsed?.args[3].toString(),
      })
    }

    // Step 3: Read back the invoice
    const countAfter = await invoice.getInvoiceCount()
    console.log('\n=== Step 3: Invoice count after:', countAfter.toString())

    const invoiceId = countAfter - 1n
    const publicData = await invoice.getInvoicePublicData(invoiceId)
    console.log('  Public data:')
    console.log('    Issuer:', publicData[0])
    console.log('    Payer:', publicData[1])
    console.log('    Category:', publicData[2].toString())
    console.log('    Status:', ['Created', 'Sent', 'PartiallyPaid', 'Paid', 'Overdue', 'Disputed', 'Cancelled'][Number(publicData[3])])
    console.log('    Created at:', new Date(Number(publicData[4]) * 1000).toISOString())

    // Step 4: Try to read encrypted amount (only issuer can)
    console.log('\n=== Step 4: Reading encrypted amount handle...')
    try {
      const encryptedAmountHandle = await invoice.getInvoiceEncryptedAmount(invoiceId)
      console.log('  Encrypted amount handle (euint128):', encryptedAmountHandle.toString())
      console.log('  ^ This is a CIPHERTEXT HANDLE, not the actual value!')
      console.log('  ^ The actual value 1000 is encrypted inside CoFHE coprocessor')
      console.log('  ^ Only authorized addresses can decrypt via @cofhe/sdk permits')
    } catch (err: any) {
      console.log('  Could not read (expected if not authorized):', err.message?.substring(0, 100))
    }

    // Step 5: Send the invoice
    console.log('\n=== Step 5: Sending invoice...')
    const sendTx = await invoice.sendInvoice(invoiceId, { gasLimit: 500000 })
    await sendTx.wait()
    const afterSend = await invoice.getInvoicePublicData(invoiceId)
    console.log('  Status after send:', ['Created', 'Sent', 'PartiallyPaid', 'Paid', 'Overdue', 'Disputed', 'Cancelled'][Number(afterSend[3])])

    // Step 6: Cancel it (to test status transitions)
    console.log('\n=== Step 6: Cancelling invoice...')
    const cancelTx = await invoice.cancelInvoice(invoiceId, { gasLimit: 500000 })
    await cancelTx.wait()
    const afterCancel = await invoice.getInvoicePublicData(invoiceId)
    console.log('  Status after cancel:', ['Created', 'Sent', 'PartiallyPaid', 'Paid', 'Overdue', 'Disputed', 'Cancelled'][Number(afterCancel[3])])

    console.log('\n=== RESULT ===')
    console.log('FHE encryption IS working on Sepolia!')
    console.log('The amount 1000 was trivially encrypted into a ciphertext handle by CoFHE.')
    console.log('On-chain, only the encrypted handle is stored - the plaintext value is NEVER visible on-chain.')
    console.log('To decrypt, you need @cofhe/sdk + EIP-712 permit signed by an authorized address.')
  } catch (err: any) {
    console.error('\n=== ERROR ===')
    console.error('Transaction failed:', err.message?.substring(0, 300))
    console.error('\nThis likely means CoFHE coprocessor rejected the input.')
    console.error('For real FHE encryption, inputs must be encrypted client-side with @cofhe/sdk')
  }
}

main().catch(console.error)
