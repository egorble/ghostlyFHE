// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ConfidentialReceipt is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    struct Receipt {
        uint256 id;
        uint256 invoiceId;
        address payer;
        address issuer;
        euint128 encryptedAmount;
        uint256 timestamp;
    }

    uint256 public nextReceiptId;
    mapping(uint256 => Receipt) private receipts;
    mapping(uint256 => uint256[]) private invoiceReceipts; // invoiceId => receiptIds
    mapping(address => uint256[]) private userReceipts; // user => receiptIds

    address public invoiceContract;

    event ReceiptIssued(uint256 indexed receiptId, uint256 indexed invoiceId, address indexed payer);

    modifier onlyInvoiceContract() {
        require(msg.sender == invoiceContract, "Only invoice contract");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize() public initializer {
        __Ownable_init(msg.sender);

    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setInvoiceContract(address _invoiceContract) external onlyOwner {
        invoiceContract = _invoiceContract;
    }

    function issueReceipt(
        uint256 invoiceId,
        address payer,
        address issuer,
        euint128 encryptedAmount
    ) external onlyInvoiceContract {
        uint256 receiptId = nextReceiptId++;

        // Persist encrypted amount
        FHE.allowThis(encryptedAmount);
        FHE.allow(encryptedAmount, payer);
        FHE.allow(encryptedAmount, issuer);

        receipts[receiptId] = Receipt({
            id: receiptId,
            invoiceId: invoiceId,
            payer: payer,
            issuer: issuer,
            encryptedAmount: encryptedAmount,
            timestamp: block.timestamp
        });

        invoiceReceipts[invoiceId].push(receiptId);
        userReceipts[payer].push(receiptId);
        userReceipts[issuer].push(receiptId);

        emit ReceiptIssued(receiptId, invoiceId, payer);
    }

    function getReceiptPublicData(uint256 receiptId) external view returns (
        uint256 invoiceId,
        address payer,
        address issuer,
        uint256 timestamp
    ) {
        Receipt storage r = receipts[receiptId];
        return (r.invoiceId, r.payer, r.issuer, r.timestamp);
    }

    function getReceiptEncryptedAmount(uint256 receiptId) external view returns (euint128) {
        Receipt storage r = receipts[receiptId];
        require(
            r.payer == msg.sender || r.issuer == msg.sender,
            "Not authorized"
        );
        return r.encryptedAmount;
    }

    function getReceiptsByInvoice(uint256 invoiceId) external view returns (uint256[] memory) {
        return invoiceReceipts[invoiceId];
    }

    function getReceiptsByUser(address user) external view returns (uint256[] memory) {
        return userReceipts[user];
    }

    function getReceiptCount() external view returns (uint256) {
        return nextReceiptId;
    }

    uint256[50] private __gap;
}
