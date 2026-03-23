# Ghostly: Confidential Invoice System on Fhenix

Ghostly is a privacy-preserving invoice and payment system built on the Fhenix blockchain using Fully Homomorphic Encryption (FHE). It allows businesses and individuals to issue, pay, and manage invoices while keeping sensitive data (like amounts, parties, and items) encrypted on-chain.

## Project Overview

### Core Technologies
- **Fhenix & CoFHE**: Utilizes the Fhenix protocol for confidential computing using FHE.
- **Solidity**: Smart contracts written for the EVM with FHE extensions.
- **Hardhat**: Development environment for compiling, testing, and deploying contracts.
- **cofhejs & cofhe-hardhat-plugin**: Libraries for interacting with FHE types (`euint`, `eaddress`, `ebool`) from JavaScript/TypeScript.
- **React & Vite**: Modern frontend stack for the user interface.

### Architecture
- **ConfidentialInvoice.sol**: The central contract managing the lifecycle of encrypted invoices.
- **ConfidentialReceipt.sol**: Automatically issues encrypted receipts upon payment verification.
- **InvoiceAnalytics.sol**: Collects encrypted statistics for business intelligence without revealing individual invoice data.
- **ConfidentialEscrow.sol**: Facilitates secure, private escrow payments.
- **ConfidentialPaymentSplitter.sol**: Allows splitting encrypted payments across multiple stakeholders.

## Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (recommended) or npm

### Installation
```bash
npm install
# or
pnpm install
```

### Building and Running
- **Compile Contracts**: `npx hardhat compile`
- **Run Tests**: `npx hardhat test` (runs on the local mock environment by default)
- **Local CoFHE Node**: `pnpm localcofhe:start` (requires Docker)
- **Deploy**: `npx hardhat run scripts/deploy.js --network <network_name>`

### Frontend Development
The frontend is located in the `/frontend` directory.
```bash
cd frontend
npm install
npm run dev
```

## Development Conventions

### FHE Types
Use the following Fhenix-specific types for sensitive data:
- `euint32`, `euint128`: Encrypted integers for quantities and amounts.
- `eaddress`: Encrypted Ethereum addresses.
- `ebool`: Encrypted boolean values.

### Privacy Patterns
- **Hashed Metadata**: Non-computational metadata (like descriptions or IDs) should be hashed on-chain (`bytes32`) while the plaintext is stored off-chain.
- **Encrypted Computation**: Use FHE for any logic that requires operating on private data (e.g., checking if `amountPaid >= subtotal`).
- **Access Control**: Use `onlyAuthorized` modifiers to ensure only the issuer, buyer, or designated auditors can interact with or view decrypted representations of the data.

### Testing
- Always test with `cofhe-hardhat-plugin`'s mock environment first.
- Use `scripts/test-full-fhe.ts` as a reference for complex FHE interactions.
- Ensure all FHE operations are validated using the `cofhejs` library in tests.

## Key Files
- `contracts/ConfidentialInvoice.sol`: Primary business logic.
- `scripts/deploy.js`: Handles multi-contract deployment and frontend synchronization.
- `frontend/src/cofhe.ts`: Frontend utility for FHE encryption/decryption.
- `hardhat.config.ts`: Network and plugin configuration.
