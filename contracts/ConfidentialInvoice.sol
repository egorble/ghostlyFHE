// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IConfidentialReceipt {
    function issueReceipt(
        uint256 invoiceId,
        address payer,
        address issuer,
        euint128 encryptedAmount
    ) external;
}

interface IInvoiceAnalytics {
    function onInvoiceCreated(address issuer, euint128 amount) external;
    function onPaymentMade(address payer, address issuer, euint128 amount) external;
}

contract ConfidentialInvoice is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    enum Status { Created, Sent, PartiallyPaid, Paid, Overdue, Disputed, Cancelled }
    enum PaymentCurrency { ETH, USDC }

    struct LineItem {
        bytes32 descriptionHash;   // legacy field (kept for storage layout)
        euint32 quantity;
        euint128 unitPrice;
        euint128 amount;
        bytes encDescription;      // AES-encrypted description (only issuer+buyer can decrypt)
    }

    struct Invoice {
        uint256 id;
        // Encrypted addresses (for privacy between contracts/integrations)
        eaddress encryptedIssuer;
        eaddress encryptedBuyer;
        // Public addresses (needed for on-chain ACL — who can pay/manage)
        address issuer;
        address buyer;
        // Encrypted financials
        euint128 subtotal;
        euint128 amountPaid;
        // Metadata (hashed for privacy — plaintext stored off-chain by issuer/buyer)
        bytes32 orderIdHash;
        bytes32 memoHash;
        euint8 encCurrency;        // encrypted currency type
        // Public (needed for on-chain logic)
        uint256 lineItemCount;
        uint256 dueDate;           // needed for markOverdue()
        Status status;
        uint256 createdAt;
        bool auditEnabled;
        ebool isPaidInFull;        // deprecated — kept for storage layout compatibility, not used
    }

    uint256 public nextInvoiceId;
    mapping(uint256 => Invoice) private invoices;
    mapping(uint256 => mapping(uint256 => LineItem)) private lineItems;
    mapping(address => uint256[]) private issuerInvoices;
    mapping(address => uint256[]) private buyerInvoices;

    IConfidentialReceipt public receiptContract;
    IInvoiceAnalytics public analyticsContract;

    mapping(uint256 => mapping(address => uint256)) public delegatedAccess;

    event InvoiceCreated(uint256 indexed invoiceId, address indexed issuer, address indexed buyer);
    event InvoiceStatusChanged(uint256 indexed invoiceId, Status newStatus);
    event PaymentMade(uint256 indexed invoiceId, address indexed payer);
    event LineItemAdded(uint256 indexed invoiceId, uint256 itemIndex);
    event AccessGranted(uint256 indexed invoiceId, address indexed delegate, uint256 expiry);
    event AccessRevoked(uint256 indexed invoiceId, address indexed delegate);

    modifier onlyIssuer(uint256 invoiceId) {
        require(invoices[invoiceId].issuer == msg.sender, "Not the issuer");
        _;
    }

    modifier onlyBuyer(uint256 invoiceId) {
        require(invoices[invoiceId].buyer == msg.sender, "Not the buyer");
        _;
    }

    modifier onlyParty(uint256 invoiceId) {
        require(
            invoices[invoiceId].issuer == msg.sender ||
            invoices[invoiceId].buyer == msg.sender,
            "Not a party"
        );
        _;
    }

    modifier onlyAuthorized(uint256 invoiceId) {
        Invoice storage inv = invoices[invoiceId];
        require(
            inv.issuer == msg.sender ||
            inv.buyer == msg.sender ||
            (inv.auditEnabled && delegatedAccess[invoiceId][msg.sender] > block.timestamp),
            "Not authorized"
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize() public initializer {
        __Ownable_init(msg.sender);

    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setReceiptContract(address _receipt) external onlyOwner {
        receiptContract = IConfidentialReceipt(_receipt);
    }

    function setAnalyticsContract(address _analytics) external onlyOwner {
        analyticsContract = IInvoiceAnalytics(_analytics);
    }

    // ========== Create Invoice ==========

    /// @param buyer Buyer address (public for ACL)
    /// @param encIssuerAddr FHE-encrypted issuer address
    /// @param encBuyerAddr FHE-encrypted buyer address
    /// @param dueDate Unix timestamp (public for overdue logic)
    /// @param encCurrency FHE-encrypted currency type
    /// @param orderIdHash keccak256 of order ID (plaintext kept off-chain)
    /// @param memoHash keccak256 of memo (plaintext kept off-chain)
    /// @param auditEnabled Whether audit delegation is allowed
    function createInvoice(
        address buyer,
        InEaddress memory encIssuerAddr,
        InEaddress memory encBuyerAddr,
        uint256 dueDate,
        InEuint8 memory encCurrency,
        bytes32 orderIdHash,
        bytes32 memoHash,
        bool auditEnabled
    ) external returns (uint256) {
        require(buyer != address(0), "Invalid buyer");
        require(buyer != msg.sender, "Cannot invoice yourself");
        require(dueDate > block.timestamp, "Due date must be future");

        uint256 invoiceId = nextInvoiceId++;

        eaddress eIssuer = FHE.asEaddress(encIssuerAddr);
        eaddress eBuyer = FHE.asEaddress(encBuyerAddr);
        euint8 eCurrency = FHE.asEuint8(encCurrency);
        euint128 zeroSubtotal = FHE.asEuint128(0);
        euint128 zeroPaid = FHE.asEuint128(0);

        FHE.allowThis(eIssuer);
        FHE.allowThis(eBuyer);
        FHE.allowThis(eCurrency);
        FHE.allowThis(zeroSubtotal);
        FHE.allowThis(zeroPaid);

        _allowBoth(eIssuer, msg.sender, buyer);
        _allowBoth(eBuyer, msg.sender, buyer);
        _allowBoth(eCurrency, msg.sender, buyer);
        _allowBoth(zeroSubtotal, msg.sender, buyer);
        _allowBoth(zeroPaid, msg.sender, buyer);

        invoices[invoiceId] = Invoice({
            id: invoiceId,
            encryptedIssuer: eIssuer,
            encryptedBuyer: eBuyer,
            issuer: msg.sender,
            buyer: buyer,
            subtotal: zeroSubtotal,
            amountPaid: zeroPaid,
            orderIdHash: orderIdHash,
            memoHash: memoHash,
            encCurrency: eCurrency,
            lineItemCount: 0,
            dueDate: dueDate,
            status: Status.Created,
            createdAt: block.timestamp,
            auditEnabled: auditEnabled,
            isPaidInFull: FHE.asEbool(false)  // deprecated field, kept for storage compat
        });

        issuerInvoices[msg.sender].push(invoiceId);
        buyerInvoices[buyer].push(invoiceId);

        emit InvoiceCreated(invoiceId, msg.sender, buyer);
        return invoiceId;
    }

    // ========== Line Items ==========

    /// @param encDescription AES-encrypted description (only issuer+buyer can decrypt off-chain)
    function addLineItem(
        uint256 invoiceId,
        bytes memory encDescription,
        InEuint32 memory encQuantity,
        InEuint128 memory encUnitPrice,
        InEuint128 memory encAmount
    ) external onlyIssuer(invoiceId) {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.Created, "Can only add items in Created status");

        euint32 qty = FHE.asEuint32(encQuantity);
        euint128 unitPrice = FHE.asEuint128(encUnitPrice);
        euint128 amount = FHE.asEuint128(encAmount);

        FHE.allowThis(qty);
        FHE.allowThis(unitPrice);
        FHE.allowThis(amount);
        _allowBoth(qty, inv.issuer, inv.buyer);
        _allowBoth(unitPrice, inv.issuer, inv.buyer);
        _allowBoth(amount, inv.issuer, inv.buyer);

        uint256 idx = inv.lineItemCount;
        lineItems[invoiceId][idx] = LineItem({
            descriptionHash: bytes32(0),
            quantity: qty,
            unitPrice: unitPrice,
            amount: amount,
            encDescription: encDescription
        });
        inv.lineItemCount++;

        inv.subtotal = FHE.add(inv.subtotal, amount);
        FHE.allowThis(inv.subtotal);
        _allowBoth(inv.subtotal, inv.issuer, inv.buyer);

        emit LineItemAdded(invoiceId, idx);
    }

    // ========== Status Transitions ==========

    function sendInvoice(uint256 invoiceId) external onlyIssuer(invoiceId) {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.Created, "Not in Created status");
        require(inv.lineItemCount > 0, "No line items");
        inv.status = Status.Sent;

        if (address(analyticsContract) != address(0)) {
            FHE.allowTransient(inv.subtotal, address(analyticsContract));
            analyticsContract.onInvoiceCreated(inv.issuer, inv.subtotal);
        }

        emit InvoiceStatusChanged(invoiceId, Status.Sent);
    }

    /// @notice Buyer sends a payment (partial or full). Accumulates amountPaid on-chain.
    /// @dev Status moves to PartiallyPaid; issuer calls confirmFullPayment() when satisfied.
    function payInvoice(uint256 invoiceId, InEuint128 memory encPayment) external onlyBuyer(invoiceId) {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.Sent || inv.status == Status.PartiallyPaid, "Not payable");

        euint128 payment = FHE.asEuint128(encPayment);

        FHE.allowThis(payment);
        _allowBoth(payment, inv.issuer, inv.buyer);

        // Accumulate — do not overwrite previous payments
        inv.amountPaid = FHE.add(inv.amountPaid, payment);
        FHE.allowThis(inv.amountPaid);
        _allowBoth(inv.amountPaid, inv.issuer, inv.buyer);

        inv.status = Status.PartiallyPaid;

        if (address(receiptContract) != address(0)) {
            FHE.allow(payment, address(receiptContract));
            receiptContract.issueReceipt(invoiceId, msg.sender, inv.issuer, payment);
        }

        if (address(analyticsContract) != address(0)) {
            FHE.allow(payment, address(analyticsContract));
            analyticsContract.onPaymentMade(msg.sender, inv.issuer, payment);
        }

        emit PaymentMade(invoiceId, msg.sender);
        emit InvoiceStatusChanged(invoiceId, Status.PartiallyPaid);
    }

    /// @notice Issuer confirms payment is complete (after off-chain decryption and verification).
    function confirmFullPayment(uint256 invoiceId) external onlyIssuer(invoiceId) {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.PartiallyPaid, "No payment to confirm");
        inv.status = Status.Paid;
        emit InvoiceStatusChanged(invoiceId, Status.Paid);
    }

    function cancelInvoice(uint256 invoiceId) external onlyIssuer(invoiceId) {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.Created || inv.status == Status.Sent || inv.status == Status.PartiallyPaid, "Cannot cancel");
        inv.status = Status.Cancelled;
        emit InvoiceStatusChanged(invoiceId, Status.Cancelled);
    }

    function disputeInvoice(uint256 invoiceId) external onlyBuyer(invoiceId) {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.Sent || inv.status == Status.PartiallyPaid, "Cannot dispute");
        inv.status = Status.Disputed;
        emit InvoiceStatusChanged(invoiceId, Status.Disputed);
    }

    function resolveDispute(uint256 invoiceId, bool inFavorOfBuyer) external onlyIssuer(invoiceId) {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.Disputed, "Not disputed");
        inv.status = inFavorOfBuyer ? Status.Cancelled : Status.Sent;
        emit InvoiceStatusChanged(invoiceId, inv.status);
    }

    function markOverdue(uint256 invoiceId) external onlyParty(invoiceId) {
        Invoice storage inv = invoices[invoiceId];
        require(inv.status == Status.Sent || inv.status == Status.PartiallyPaid, "Not applicable");
        require(block.timestamp > inv.dueDate, "Not overdue yet");
        inv.status = Status.Overdue;
        emit InvoiceStatusChanged(invoiceId, Status.Overdue);
    }

    // ========== Access Delegation ==========

    function grantAccess(uint256 invoiceId, address delegate, uint256 expiry) external onlyParty(invoiceId) {
        Invoice storage inv = invoices[invoiceId];
        require(inv.auditEnabled, "Audit not enabled");
        require(expiry > block.timestamp, "Expiry must be future");
        delegatedAccess[invoiceId][delegate] = expiry;

        FHE.allow(inv.encryptedIssuer, delegate);
        FHE.allow(inv.encryptedBuyer, delegate);
        FHE.allow(inv.subtotal, delegate);
        FHE.allow(inv.amountPaid, delegate);
        FHE.allow(inv.encCurrency, delegate);

        emit AccessGranted(invoiceId, delegate, expiry);
    }

    function revokeAccess(uint256 invoiceId, address delegate) external onlyParty(invoiceId) {
        delegatedAccess[invoiceId][delegate] = 0;
        emit AccessRevoked(invoiceId, delegate);
    }

    // ========== View Functions ==========

    /// @notice Minimal public data — only what's needed for on-chain logic
    function getInvoiceMinimal(uint256 invoiceId) external view returns (
        uint256 lineItemCount,
        uint256 dueDate,
        Status status,
        uint256 createdAt,
        bool auditEnabled
    ) {
        Invoice storage inv = invoices[invoiceId];
        return (inv.lineItemCount, inv.dueDate, inv.status, inv.createdAt, inv.auditEnabled);
    }

    /// @notice Full invoice data — only issuer, buyer, or authorized delegate
    function getInvoiceFull(uint256 invoiceId) external view onlyAuthorized(invoiceId) returns (
        address issuer,
        address buyer,
        bytes32 orderIdHash,
        bytes32 memoHash,
        uint256 lineItemCount,
        uint256 dueDate,
        Status status,
        uint256 createdAt,
        bool auditEnabled
    ) {
        Invoice storage inv = invoices[invoiceId];
        return (
            inv.issuer, inv.buyer, inv.orderIdHash, inv.memoHash,
            inv.lineItemCount, inv.dueDate, inv.status, inv.createdAt, inv.auditEnabled
        );
    }

    /// @notice Encrypted financial data — only authorized
    function getEncryptedTotals(uint256 invoiceId) external view onlyAuthorized(invoiceId) returns (
        euint128 subtotal,
        euint128 amountPaid,
        euint8 currency
    ) {
        Invoice storage inv = invoices[invoiceId];
        return (inv.subtotal, inv.amountPaid, inv.encCurrency);
    }

    function getEncryptedAddresses(uint256 invoiceId) external view onlyAuthorized(invoiceId) returns (
        eaddress encIssuer,
        eaddress encBuyer
    ) {
        Invoice storage inv = invoices[invoiceId];
        return (inv.encryptedIssuer, inv.encryptedBuyer);
    }

    /// @notice Line item encrypted description + FHE data — only authorized
    function getLineItem(uint256 invoiceId, uint256 itemIndex) external view onlyAuthorized(invoiceId)
        returns (bytes memory encDescription, euint32 quantity, euint128 unitPrice, euint128 amount)
    {
        LineItem storage item = lineItems[invoiceId][itemIndex];
        return (item.encDescription.length > 0 ? item.encDescription : bytes(""), item.quantity, item.unitPrice, item.amount);
    }

    function getIssuerInvoices(address issuer) external view returns (uint256[] memory) {
        return issuerInvoices[issuer];
    }

    function getBuyerInvoices(address buyer) external view returns (uint256[] memory) {
        return buyerInvoices[buyer];
    }

    function getInvoiceCount() external view returns (uint256) {
        return nextInvoiceId;
    }

    // ========== Internal ==========

    function _allowBoth(euint128 val, address a, address b) internal {
        FHE.allow(val, a);
        FHE.allow(val, b);
    }

    function _allowBoth(euint32 val, address a, address b) internal {
        FHE.allow(val, a);
        FHE.allow(val, b);
    }

    function _allowBoth(euint8 val, address a, address b) internal {
        FHE.allow(val, a);
        FHE.allow(val, b);
    }

    function _allowBoth(eaddress val, address a, address b) internal {
        FHE.allow(val, a);
        FHE.allow(val, b);
    }

    uint256[50] private __gap;
}
