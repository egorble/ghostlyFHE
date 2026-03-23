import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { saveDeployment } from './utils'

task('deploy-ghostly', 'Deploy the Ghostly invoice system contracts').setAction(async (_, hre: HardhatRuntimeEnvironment) => {
	const { ethers, network } = hre

	console.log(`Deploying Ghostly to ${network.name}...`)

	const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

	// 1. Deploy ConfidentialReceipt
	const Receipt = await ethers.getContractFactory('ConfidentialReceipt')
	const receipt = await Receipt.deploy()
	await receipt.waitForDeployment()
	const receiptAddr = await receipt.getAddress()
	console.log(`ConfidentialReceipt deployed to: ${receiptAddr}`)
	saveDeployment(network.name, 'ConfidentialReceipt', receiptAddr)

	// 2. Deploy InvoiceAnalytics
	const Analytics = await ethers.getContractFactory('InvoiceAnalytics')
	const analytics = await Analytics.deploy()
	await analytics.waitForDeployment()
	const analyticsAddr = await analytics.getAddress()
	console.log(`InvoiceAnalytics deployed to: ${analyticsAddr}`)
	saveDeployment(network.name, 'InvoiceAnalytics', analyticsAddr)

	// 3. Deploy ConfidentialInvoice
	const Invoice = await ethers.getContractFactory('ConfidentialInvoice')
	const invoice = await Invoice.deploy()
	await invoice.waitForDeployment()
	const invoiceAddr = await invoice.getAddress()
	console.log(`ConfidentialInvoice deployed to: ${invoiceAddr}`)
	saveDeployment(network.name, 'ConfidentialInvoice', invoiceAddr)

	// 4. Deploy ConfidentialEscrow
	const Escrow = await ethers.getContractFactory('ConfidentialEscrow')
	const escrow = await Escrow.deploy(deployer.address) // deployer as initial arbiter
	await escrow.waitForDeployment()
	const escrowAddr = await escrow.getAddress()
	console.log(`ConfidentialEscrow deployed to: ${escrowAddr}`)
	saveDeployment(network.name, 'ConfidentialEscrow', escrowAddr)

	// 5. Deploy ConfidentialPaymentSplitter
	const Splitter = await ethers.getContractFactory('ConfidentialPaymentSplitter')
	const splitter = await Splitter.deploy()
	await splitter.waitForDeployment()
	const splitterAddr = await splitter.getAddress()
	console.log(`ConfidentialPaymentSplitter deployed to: ${splitterAddr}`)
	saveDeployment(network.name, 'ConfidentialPaymentSplitter', splitterAddr)

	// 6. Wire contracts together
	console.log('\nWiring contracts...')
	await invoice.setReceiptContract(receiptAddr)
	await invoice.setAnalyticsContract(analyticsAddr)
	await receipt.setInvoiceContract(invoiceAddr)
	await analytics.setInvoiceContract(invoiceAddr)
	console.log('Contracts wired successfully!')

	console.log('\n--- Deployment Summary ---')
	console.log(`ConfidentialInvoice:        ${invoiceAddr}`)
	console.log(`ConfidentialReceipt:        ${receiptAddr}`)
	console.log(`InvoiceAnalytics:           ${analyticsAddr}`)
	console.log(`ConfidentialEscrow:         ${escrowAddr}`)
	console.log(`ConfidentialPaymentSplitter: ${splitterAddr}`)

	return { invoiceAddr, receiptAddr, analyticsAddr, escrowAddr, splitterAddr }
})
