// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ConfidentialPaymentSplitter is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    struct Split {
        uint256 id;
        uint256 invoiceId;
        address creator;
        address[] payers;
        mapping(address => euint128) shares;       // encrypted share per payer
        mapping(address => euint128) amountPaid;    // encrypted amount paid per payer
        mapping(address => bool) hasPaid;
        euint128 totalShares;
        uint256 payerCount;
        uint256 paidCount;
        bool finalized;
    }

    uint256 public nextSplitId;
    mapping(uint256 => Split) private splits;
    mapping(address => uint256[]) private userSplits;

    event SplitCreated(uint256 indexed splitId, uint256 indexed invoiceId, uint256 payerCount);
    event SharePaid(uint256 indexed splitId, address indexed payer);
    event SplitFinalized(uint256 indexed splitId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize() public initializer {
        __Ownable_init(msg.sender);

    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function createSplit(
        uint256 invoiceId,
        address[] calldata payers,
        InEuint128[] memory encryptedShares
    ) external returns (uint256) {
        require(payers.length > 0, "No payers");
        require(payers.length == encryptedShares.length, "Length mismatch");

        uint256 splitId = nextSplitId++;
        Split storage s = splits[splitId];
        s.id = splitId;
        s.invoiceId = invoiceId;
        s.creator = msg.sender;
        s.payers = payers;
        s.payerCount = payers.length;

        // Sum up shares and store per-payer encrypted share
        euint128 runningTotal = FHE.asEuint128(0);
        FHE.allowThis(runningTotal);

        for (uint256 i = 0; i < payers.length; i++) {
            euint128 share = FHE.asEuint128(encryptedShares[i]);
            FHE.allowThis(share);
            FHE.allow(share, payers[i]); // each payer can see their own share

            euint128 zeroPaid = FHE.asEuint128(0);
            FHE.allowThis(zeroPaid);
            FHE.allow(zeroPaid, payers[i]);

            s.shares[payers[i]] = share;
            s.amountPaid[payers[i]] = zeroPaid;

            runningTotal = FHE.add(runningTotal, share);
            FHE.allowThis(runningTotal);

            userSplits[payers[i]].push(splitId);
        }

        s.totalShares = runningTotal;
        FHE.allow(runningTotal, msg.sender);

        emit SplitCreated(splitId, invoiceId, payers.length);
        return splitId;
    }

    function payMyShare(uint256 splitId, InEuint128 memory encryptedPayment) external {
        Split storage s = splits[splitId];
        require(!s.finalized, "Split finalized");
        require(!s.hasPaid[msg.sender], "Already paid");

        // Verify caller is a payer in this split
        bool isPayer = false;
        for (uint256 i = 0; i < s.payers.length; i++) {
            if (s.payers[i] == msg.sender) {
                isPayer = true;
                break;
            }
        }
        require(isPayer, "Not a payer in this split");

        euint128 payment = FHE.asEuint128(encryptedPayment);

        // Check payment >= share (encrypted comparison)
        ebool sufficient = FHE.gte(payment, s.shares[msg.sender]);
        // Cap at share amount
        euint128 actualPaid = FHE.select(sufficient, s.shares[msg.sender], payment);

        FHE.allowThis(actualPaid);
        FHE.allow(actualPaid, msg.sender);
        FHE.allow(actualPaid, s.creator);

        s.amountPaid[msg.sender] = actualPaid;
        s.hasPaid[msg.sender] = true;
        s.paidCount++;

        if (s.paidCount == s.payerCount) {
            s.finalized = true;
            emit SplitFinalized(splitId);
        }

        emit SharePaid(splitId, msg.sender);
    }

    // --- Views ---

    function getSplitPublicData(uint256 splitId) external view returns (
        uint256 invoiceId,
        address creator,
        address[] memory payers,
        uint256 paidCount,
        bool finalized
    ) {
        Split storage s = splits[splitId];
        return (s.invoiceId, s.creator, s.payers, s.paidCount, s.finalized);
    }

    function getMyShare(uint256 splitId) external view returns (euint128) {
        Split storage s = splits[splitId];
        bool isPayer = false;
        for (uint256 i = 0; i < s.payers.length; i++) {
            if (s.payers[i] == msg.sender) {
                isPayer = true;
                break;
            }
        }
        require(isPayer, "Not a payer");
        return s.shares[msg.sender];
    }

    function getMyPayment(uint256 splitId) external view returns (euint128) {
        Split storage s = splits[splitId];
        bool isPayer = false;
        for (uint256 i = 0; i < s.payers.length; i++) {
            if (s.payers[i] == msg.sender) {
                isPayer = true;
                break;
            }
        }
        require(isPayer, "Not a payer");
        return s.amountPaid[msg.sender];
    }

    function hasPayerPaid(uint256 splitId, address payer) external view returns (bool) {
        return splits[splitId].hasPaid[payer];
    }

    function getUserSplits(address user) external view returns (uint256[] memory) {
        return userSplits[user];
    }

    uint256[50] private __gap;
}
