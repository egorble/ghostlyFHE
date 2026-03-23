import { ethers } from 'hardhat'
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/node'

async function main() {
  const [deployer] = await ethers.getSigners()
  const provider = deployer.provider!
  console.log('Account:', deployer.address)
  const chainId = (await provider.getNetwork()).chainId
  console.log('ChainId:', chainId.toString())

  // Step 1: Initialize cofhejs
  console.log('\n=== Step 1: Initializing CoFHE SDK...')
  try {
    const initResult = await cofhejs.initialize({
      provider: provider as any,
      signer: deployer as any,
      environment: 'TESTNET',
    })
    console.log('Init result:', JSON.stringify(initResult, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ).substring(0, 500))
  } catch (err: any) {
    console.log('Init threw:', err.message)
    console.log('Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err)).substring(0, 500))
  }

  // Try with explicit URLs
  console.log('\n=== Step 1b: Trying with explicit URLs...')
  try {
    const initResult2 = await cofhejs.initialize({
      provider: provider as any,
      signer: deployer as any,
      coFheUrl: 'https://testnet-cofhe.fhenix.zone',
      verifierUrl: 'https://testnet-cofhe-vrf.fhenix.zone',
      thresholdNetworkUrl: 'https://testnet-cofhe-tn.fhenix.zone',
      environment: 'TESTNET',
    })
    console.log('Init2 success:', initResult2.success)
    if (!initResult2.success) {
      console.log('Init2 error:', JSON.stringify(initResult2.error, Object.getOwnPropertyNames(initResult2.error)).substring(0, 500))
    } else {
      console.log('SDK initialized successfully!')

      // Test encryption
      console.log('\n=== Step 2: Encrypting value 1000...')
      const encResult = await cofhejs.encrypt([Encryptable.uint128(1000n)] as const)
      console.log('Encrypt success:', encResult.success)
      if (encResult.success) {
        const [enc] = encResult.data
        console.log('ctHash:', enc.ctHash.toString())
        console.log('signature length:', enc.signature.length)

        // Create invoice
        console.log('\n=== Step 3: Creating invoice...')
        const encDue = (await cofhejs.encrypt([Encryptable.uint64(BigInt(Math.floor(Date.now() / 1000) + 86400))] as const))
        if (!encDue.success) { console.log('Due encrypt failed'); return }

        const invoice = await ethers.getContractAt('ConfidentialInvoice', '0xC02a35c1342a727918E1D23eD44742684569fE07')
        const tx = await invoice.createInvoice(
          '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          enc, encDue.data[0], 1,
          { gasLimit: 5000000 }
        )
        console.log('Tx:', tx.hash)
        const receipt = await tx.wait()
        console.log('SUCCESS! Gas:', receipt?.gasUsed.toString())

        const count = await invoice.getInvoiceCount()
        const id = count - 1n
        const handle = await invoice.getInvoiceEncryptedAmount(id)
        console.log('\nEncrypted handle on-chain:', handle.toString())
        console.log('^ NOT the plaintext 1000 — this is a ciphertext reference!')

        // Unseal
        console.log('\n=== Step 4: Unsealing...')
        const unseal = await cofhejs.unseal(handle, FheTypes.Uint128)
        console.log('Unseal:', JSON.stringify(unseal, (k, v) => typeof v === 'bigint' ? v.toString() : v).substring(0, 300))
      } else {
        console.log('Encrypt error:', JSON.stringify(encResult.error, Object.getOwnPropertyNames(encResult.error)).substring(0, 500))
      }
    }
  } catch (err: any) {
    console.log('Init2 threw:', err.message?.substring(0, 300))
  }
}

main().catch(console.error)
