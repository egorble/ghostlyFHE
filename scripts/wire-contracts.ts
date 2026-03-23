import { ethers } from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  const deploymentPath = path.join(__dirname, '../deployments/eth-sepolia.json')
  const deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))

  const invoiceAddr = deployments['ConfidentialInvoice']
  const receiptAddr = deployments['ConfidentialReceipt']
  const analyticsAddr = deployments['InvoiceAnalytics']

  console.log('Wiring contracts...')
  console.log('Invoice:', invoiceAddr)
  console.log('Receipt:', receiptAddr)
  console.log('Analytics:', analyticsAddr)

  const invoice = await ethers.getContractAt('ConfidentialInvoice', invoiceAddr)
  const receipt = await ethers.getContractAt('ConfidentialReceipt', receiptAddr)
  const analytics = await ethers.getContractAt('InvoiceAnalytics', analyticsAddr)

  console.log('\n1/4 setReceiptContract...')
  const tx1 = await invoice.setReceiptContract(receiptAddr)
  await tx1.wait()
  console.log('Done:', tx1.hash)

  console.log('2/4 setAnalyticsContract...')
  const tx2 = await invoice.setAnalyticsContract(analyticsAddr)
  await tx2.wait()
  console.log('Done:', tx2.hash)

  console.log('3/4 receipt.setInvoiceContract...')
  const tx3 = await receipt.setInvoiceContract(invoiceAddr)
  await tx3.wait()
  console.log('Done:', tx3.hash)

  console.log('4/4 analytics.setInvoiceContract...')
  const tx4 = await analytics.setInvoiceContract(invoiceAddr)
  await tx4.wait()
  console.log('Done:', tx4.hash)

  console.log('\nAll contracts wired successfully!')
}

main().catch(console.error)
