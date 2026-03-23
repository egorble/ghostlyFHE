// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract InvoiceAnalytics is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    struct UserStats {
        euint128 totalInvoiced;    // sum of all invoices issued
        euint128 totalReceived;    // sum of all payments received
        euint128 totalPaid;        // sum of all payments made
        euint32 invoiceCount;      // number of invoices created
        euint32 paymentCount;      // number of payments made
        bool initialized;
    }

    mapping(address => UserStats) private stats;
    address public invoiceContract;

    event AnalyticsUpdated(address indexed user);

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

    function _initUser(address user) internal {
        if (!stats[user].initialized) {
            stats[user].totalInvoiced = FHE.asEuint128(0);
            stats[user].totalReceived = FHE.asEuint128(0);
            stats[user].totalPaid = FHE.asEuint128(0);
            stats[user].invoiceCount = FHE.asEuint32(0);
            stats[user].paymentCount = FHE.asEuint32(0);

            FHE.allowThis(stats[user].totalInvoiced);
            FHE.allowThis(stats[user].totalReceived);
            FHE.allowThis(stats[user].totalPaid);
            FHE.allowThis(stats[user].invoiceCount);
            FHE.allowThis(stats[user].paymentCount);

            FHE.allow(stats[user].totalInvoiced, user);
            FHE.allow(stats[user].totalReceived, user);
            FHE.allow(stats[user].totalPaid, user);
            FHE.allow(stats[user].invoiceCount, user);
            FHE.allow(stats[user].paymentCount, user);

            stats[user].initialized = true;
        }
    }

    function onInvoiceCreated(address issuer, euint128 amount) external onlyInvoiceContract {
        _initUser(issuer);

        UserStats storage s = stats[issuer];
        s.totalInvoiced = FHE.add(s.totalInvoiced, amount);
        s.invoiceCount = FHE.add(s.invoiceCount, FHE.asEuint32(1));

        FHE.allowThis(s.totalInvoiced);
        FHE.allowThis(s.invoiceCount);
        FHE.allow(s.totalInvoiced, issuer);
        FHE.allow(s.invoiceCount, issuer);

        emit AnalyticsUpdated(issuer);
    }

    function onPaymentMade(address payer, address issuer, euint128 amount) external onlyInvoiceContract {
        _initUser(payer);
        _initUser(issuer);

        // Update payer stats
        UserStats storage ps = stats[payer];
        ps.totalPaid = FHE.add(ps.totalPaid, amount);
        ps.paymentCount = FHE.add(ps.paymentCount, FHE.asEuint32(1));

        FHE.allowThis(ps.totalPaid);
        FHE.allowThis(ps.paymentCount);
        FHE.allow(ps.totalPaid, payer);
        FHE.allow(ps.paymentCount, payer);

        // Update issuer stats
        UserStats storage is_ = stats[issuer];
        is_.totalReceived = FHE.add(is_.totalReceived, amount);

        FHE.allowThis(is_.totalReceived);
        FHE.allow(is_.totalReceived, issuer);

        emit AnalyticsUpdated(payer);
        emit AnalyticsUpdated(issuer);
    }

    // --- Views (only the user can see their own stats) ---

    function getMyTotalInvoiced() external view returns (euint128) {
        require(stats[msg.sender].initialized, "No data");
        return stats[msg.sender].totalInvoiced;
    }

    function getMyTotalReceived() external view returns (euint128) {
        require(stats[msg.sender].initialized, "No data");
        return stats[msg.sender].totalReceived;
    }

    function getMyTotalPaid() external view returns (euint128) {
        require(stats[msg.sender].initialized, "No data");
        return stats[msg.sender].totalPaid;
    }

    function getMyInvoiceCount() external view returns (euint32) {
        require(stats[msg.sender].initialized, "No data");
        return stats[msg.sender].invoiceCount;
    }

    function getMyPaymentCount() external view returns (euint32) {
        require(stats[msg.sender].initialized, "No data");
        return stats[msg.sender].paymentCount;
    }

    /// @notice Compare who invoiced more between caller and another address
    /// @return encrypted bool: true if caller invoiced more
    function didIInvoiceMore(address other) external returns (ebool) {
        require(stats[msg.sender].initialized, "No data for caller");
        require(stats[other].initialized, "No data for other");
        return FHE.gt(stats[msg.sender].totalInvoiced, stats[other].totalInvoiced);
    }

    uint256[50] private __gap;
}
