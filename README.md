# Ghostly FHE

Privacy-preserving invoice and payment system built on Fhenix using Fully Homomorphic Encryption. All sensitive financial data — amounts, addresses, line items — is encrypted on-chain and can only be decrypted by authorized parties.

**Live:** https://ghostlyfhe.xyz | **App:** https://app.ghostlyfhe.xyz

## How It Works

Ghostly lets users create, send, and pay invoices where every piece of sensitive data is encrypted using FHE. The blockchain stores only ciphertexts — no one (including validators) can see the amounts or parties involved. Only the invoice issuer and buyer can decrypt the data through a permit system.

### Encryption Model

| Data | Method | Who Can Decrypt |
|------|--------|-----------------|
| Amounts (subtotal, payments) | FHE `euint128` | Issuer, buyer, granted auditors |
| Addresses (issuer, buyer) | FHE `eaddress` | Issuer, buyer |
| Currency type | FHE `euint8` | Issuer, buyer |
| Line item descriptions | AES-GCM (client-side) | Issuer, buyer (shared derived key) |
| Order ID, memo | Keccak256 hash on-chain | Off-chain verification only |

**FHE encryption** allows the smart contract to perform computations on encrypted data (e.g., accumulating payment totals) without ever decrypting it. **AES-GCM** is used for data that doesn't need on-chain computation (descriptions), with a key derived from `keccak256(issuer:buyer:invoiceId)`.

## Architecture

```
                    ┌──────────────────────────────┐
                    │         Frontend (React)       │
                    │  Vite + TailwindCSS + Zustand  │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │      Encryption Layer          │
                    │  @cofhe/sdk (encrypt)           │
                    │  cofhejs (decrypt/unseal)       │
                    │  AES-GCM (descriptions)         │
                    └──────────┬───────────────────┘
                               │
          ┌────────────────────▼────────────────────────┐
          │              Smart Contracts (Sepolia)        │
          │                                               │
          │  ConfidentialInvoice ◄──► ConfidentialReceipt │
          │         │                                     │
          │         ▼                                     │
          │  InvoiceAnalytics    ConfidentialPaymentSplitter │
          └───────────────────────────────────────────────┘
```

## Smart Contracts

### ConfidentialInvoice

Core contract managing the full invoice lifecycle. Stores encrypted issuer/buyer addresses, encrypted amounts, and hashed metadata. Supports statuses: Created → Sent → PartiallyPaid → Paid (or Overdue / Disputed / Cancelled).

Key operations:
- `createInvoice()` — create with encrypted addresses, currency, and due date
- `addLineItem()` — add FHE-encrypted line items (qty, unit price, amount) with AES-encrypted description
- `sendInvoice()` — finalize and notify analytics
- `payInvoice()` — buyer submits encrypted payment, contract accumulates `amountPaid` homomorphically
- `disputeInvoice()` / `resolveDispute()` — conflict resolution
- `grantAccess()` / `revokeAccess()` — delegate decryption to auditors with time-based expiry

### ConfidentialReceipt

Automatically issues encrypted receipts on each payment. Receipt amounts are only decryptable by the payer and issuer.

### InvoiceAnalytics

Aggregates encrypted statistics per user — total invoiced, total received, total paid, invoice count, payment count. All values are FHE-encrypted; users can only view their own stats.

### ConfidentialPaymentSplitter

Splits an encrypted payment across multiple parties. Each participant sees only their own share.

### Contract Addresses (Sepolia)

```
ConfidentialInvoice:         0xf19d5A1ab4F4DD9714800676fCB00CA48aEaD819
ConfidentialReceipt:         0x206F3ac8Dd7DCd0681cf0D760AeBD6111D17c687
InvoiceAnalytics:            0x6725331525a49051e0caf0927696896eD30e27b9
ConfidentialPaymentSplitter: 0x57612c0347cFDe7f1a1dfF1c0995D888cA5A59B7
```

## Frontend

Single-page React app with wallet-based authentication via MetaMask.

### Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — invoice counts, activity chart, recent invoices |
| `/invoices` | Invoice list with tabs for issued & received |
| `/invoices/create` | Multi-step invoice creation form |
| `/invoices/:id` | Invoice detail with decrypted data, payment actions |
| `/receipts` | Payment receipt history |
| `/audit` | Grant/revoke audit access to delegates |
| `/audit/verify` | Verify audit authorization packages |

### Key Services

- **FhenixService** — reads/writes to smart contracts via Viem
- **CofheService** — FHE encrypt (via `@cofhe/sdk`) and decrypt (via `cofhejs`), plus AES-GCM for descriptions
- **InvoiceCacheService** — background sync every 30s, caches invoices and decrypted values in Zustand store
- **RpcQueue** — request throttling and deduplication for RPC calls

### Lazy Initialization

FHE signatures are deferred to avoid prompting users on page load:
- `cofheClient.connect()` — runs at wallet connection (1 signature)
- `ensurePermit()` — runs before first encryption operation
- `cofhejs.initializeWithViem()` — runs before first decryption operation

## Tech Stack

**Contracts:** Solidity 0.8.25, Hardhat, OpenZeppelin (UUPS upgradeable), Fhenix CoFHE

**Frontend:** React 19, Vite, TypeScript, TailwindCSS, Zustand, Viem, Framer Motion

**FHE:** `@cofhe/sdk` (encryption), `cofhejs` (decryption/unseal), TFHE WASM

**Deployment:** Nginx reverse proxy, systemd services, Let's Encrypt SSL, Sepolia testnet

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask with Sepolia ETH

### Install & Run

```bash
# Root — contracts
npm install
npx hardhat compile

# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173

# Landing page
cd landing
npm install
npm run dev
# → http://localhost:5174
```

### Environment Variables

Create `.env` in the root:

```
PRIVATE_KEY=<deployer_private_key>
SEPOLIA_RPC_URL=https://ethereum-sepolia.publicnode.com
ETHERSCAN_API_KEY=<for_contract_verification>
```

### Deploy Contracts

```bash
npx hardhat deploy-ghostly --network eth-sepolia
```

### Deploy to Server

```bash
# Full deployment (landing + app + SSL + systemd)
bash deploy/deploy-all.sh

# Quick update after code changes
bash deploy/update-landing.sh
bash deploy/update-app.sh
```

## Project Structure

```
ghostly/
├── contracts/
│   ├── ConfidentialInvoice.sol
│   ├── ConfidentialReceipt.sol
│   ├── InvoiceAnalytics.sol
│   └── ConfidentialPaymentSplitter.sol
├── frontend/
│   └── src/
│       ├── components/        # UI components
│       ├── pages/             # Route pages
│       ├── services/          # FHE, contract interaction, caching
│       ├── stores/            # Zustand state management
│       ├── contracts/         # ABIs and addresses
│       ├── lib/               # Types, utils, constants
│       └── cofhe.ts           # CoFHE client setup
├── landing/                   # Marketing landing page
├── deploy/                    # Server deployment scripts
├── tasks/                     # Hardhat deploy tasks
└── hardhat.config.ts
```

## License

MIT
