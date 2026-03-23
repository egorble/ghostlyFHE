// Minimal test to isolate CoFHE initialization issue
import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Account:', deployer.address)
  console.log('Node version:', process.version)

  // Try importing and initializing TFHE directly
  console.log('\n=== Testing TFHE WASM loading...')
  try {
    const cofhejsModule = require('cofhejs/node')
    console.log('cofhejs exports:', Object.keys(cofhejsModule).join(', '))

    // Try to initialize with error catching at each level
    const { cofhejs, Encryptable } = cofhejsModule

    console.log('\n=== Attempting cofhejs.initialize with ignoreErrors...')
    const result = await cofhejs.initialize({
      provider: deployer.provider as any,
      signer: deployer as any,
      environment: 'TESTNET',
      ignoreErrors: true,
    })

    console.log('Result success:', result.success)
    if (result.success) {
      console.log('SDK ready! Testing encrypt...')
      const enc = await cofhejs.encrypt([Encryptable.uint128(42n)] as const)
      console.log('Encrypt success:', enc.success)
      if (enc.success) {
        console.log('Encrypted ctHash:', enc.data[0].ctHash.toString())
      } else {
        console.log('Encrypt error:', JSON.stringify(enc.error, null, 2).substring(0, 500))
      }
    } else {
      console.log('Init error:', JSON.stringify(result.error, null, 2)?.substring(0, 500))
    }
  } catch (err: any) {
    console.log('Exception:', err.message)
    console.log('Stack:', err.stack?.substring(0, 500))
  }
}

main().catch(err => {
  console.error('Fatal:', err.message)
  console.error(err.stack?.substring(0, 500))
})
