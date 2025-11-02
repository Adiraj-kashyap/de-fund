// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IFundingEscrow} from "./interfaces/IFundingEscrow.sol";
import {IERC20} from "./interfaces/IERC20.sol";

/// @title MilestoneGovernance
/// @notice DAO-style governance layer that validates milestone completion claims
///         and instructs the associated FundingEscrow contract to release funds.
contract MilestoneGovernance {
    /// @notice Emitted when a voter stakes governance tokens.
    event Staked(address indexed voter, uint256 amount, uint256 totalStaked);

    /// @notice Emitted when a voter withdraws previously staked tokens.
    event Unstaked(address indexed voter, uint256 amount, uint256 totalStaked);

    /// @notice Emitted when a new proposal is created for a milestone stage.
    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed stageIndex,
        uint64 startTime,
        uint64 endTime,
        string metadataURI
    );

    /// @notice Emitted when a stakeholder casts a vote.
    event VoteCast(address indexed voter, uint256 indexed proposalId, bool support, uint256 weight);

    /// @notice Emitted when a proposal is finalized.
    event ProposalFinalized(
        uint256 indexed proposalId,
        bool passed,
        uint256 forVotes,
        uint256 againstVotes
    );

    /// @notice Emitted when a proposal is cancelled before completion.
    event ProposalCancelled(uint256 indexed proposalId);

    /// @notice Emitted when the DAO declares the project failed, enabling refunds.
    event ProjectFailureDeclared(uint256 indexed proposalId);

    error ZeroAddress();
    error AmountZero();
    error TransferFailed();
    error NotAuthorized();
    error NoVotingPower();
    error InvalidStage(uint256 stageIndex);
    error StageAlreadyReleased(uint256 stageIndex);
    error ProposalActive(uint256 proposalId);
    error ProposalNotFound(uint256 proposalId);
    error VotingClosed(uint256 proposalId);
    error AlreadyVoted(uint256 proposalId, address voter);
    error UnstakeLocked(uint256 unlockTimestamp);
    error ProposalStillActive(uint256 proposalId);
    error ProposalAlreadyFinalized(uint256 proposalId);
    error ProposalAlreadyCancelled(uint256 proposalId);
    error VotingPeriodTooShort();
    error InvalidBasisPoints();
    error ProposalPassed(uint256 proposalId);
    error ReentrancyDetected();

    struct Receipt {
        bool hasVoted;
        bool support;
        uint256 weight;
    }

    struct Proposal {
        uint256 id;
        uint256 stageIndex;
        uint64 startTime;
        uint64 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 totalStakedSnapshot;
        bool passed;
        bool finalized;
        bool cancelled;
        string metadataURI;
        mapping(address => Receipt) receipts;
    }

    struct ProposalView {
        uint256 id;
        uint256 stageIndex;
        uint64 startTime;
        uint64 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 totalStakedSnapshot;
        bool passed;
        bool finalized;
        bool cancelled;
        string metadataURI;
    }

    uint256 private constant _ONE_HUNDRED_PERCENT = 10_000; // Basis points (100.00%)
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    IFundingEscrow public immutable escrow;
    IERC20 public immutable governanceToken;
    uint256 public immutable votingPeriod;
    uint256 public immutable quorumBps;
    uint256 public immutable approvalThresholdBps;

    uint256 public proposalCount;
    uint256 public totalStaked;

    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => uint256) public latestProposalByStage;
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public voteLock;

    uint256 private _status;

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrancyDetected();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor(
        address escrowAddress,
        address governanceTokenAddress,
        uint256 votingPeriodSeconds,
        uint256 quorumBasisPoints,
        uint256 approvalThresholdBasisPoints
    ) {
        if (escrowAddress == address(0) || governanceTokenAddress == address(0)) revert ZeroAddress();
        if (votingPeriodSeconds == 0) revert VotingPeriodTooShort();
        if (quorumBasisPoints > _ONE_HUNDRED_PERCENT || approvalThresholdBasisPoints > _ONE_HUNDRED_PERCENT) {
            revert InvalidBasisPoints();
        }

        escrow = IFundingEscrow(escrowAddress);
        governanceToken = IERC20(governanceTokenAddress);
        votingPeriod = votingPeriodSeconds;
        quorumBps = quorumBasisPoints;
        approvalThresholdBps = approvalThresholdBasisPoints;
        _status = _NOT_ENTERED;
    }

    // -------------------- Staking Logic --------------------

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountZero();

        bool ok = governanceToken.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();

        stakedBalance[msg.sender] += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount, totalStaked);
    }

    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountZero();
        if (stakedBalance[msg.sender] < amount) revert NoVotingPower();

        uint256 lock = voteLock[msg.sender];
        if (lock != 0 && block.timestamp <= lock) revert UnstakeLocked(lock);

        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;

        bool ok = governanceToken.transfer(msg.sender, amount);
        if (!ok) revert TransferFailed();

        emit Unstaked(msg.sender, amount, totalStaked);
    }

    // -------------------- Proposal Lifecycle --------------------

    function createMilestoneProposal(uint256 stageIndex, string calldata metadataURI)
        external
        returns (uint256 proposalId)
    {
        if (msg.sender != escrow.projectOwner()) revert NotAuthorized();
        uint256 stages = escrow.totalStages();
        if (stageIndex >= stages) revert InvalidStage(stageIndex);
        if (escrow.stageReleased(stageIndex)) revert StageAlreadyReleased(stageIndex);
        if (totalStaked == 0) revert NoVotingPower();

        uint256 latestId = latestProposalByStage[stageIndex];
        if (latestId != 0) {
            Proposal storage latest = _proposals[latestId];
            if (!latest.finalized && !latest.cancelled && block.timestamp <= latest.endTime) {
                revert ProposalActive(latestId);
            }
        }

        proposalCount += 1;
        proposalId = proposalCount;

        Proposal storage proposal = _proposals[proposalId];
        proposal.id = proposalId;
        proposal.stageIndex = stageIndex;
        proposal.startTime = uint64(block.timestamp);
        proposal.endTime = uint64(block.timestamp + votingPeriod);
        proposal.totalStakedSnapshot = totalStaked;
        proposal.metadataURI = metadataURI;

        latestProposalByStage[stageIndex] = proposalId;

        emit ProposalCreated(proposalId, stageIndex, proposal.startTime, proposal.endTime, metadataURI);
    }

    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = _getExistingProposal(proposalId);
        if (proposal.cancelled) revert ProposalAlreadyCancelled(proposalId);
        if (proposal.finalized) revert ProposalAlreadyFinalized(proposalId);
        if (msg.sender != escrow.projectOwner()) revert NotAuthorized();

        proposal.cancelled = true;
        emit ProposalCancelled(proposalId);
    }

    // -------------------- Voting --------------------

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = _getExistingProposal(proposalId);
        if (proposal.cancelled) revert ProposalAlreadyCancelled(proposalId);
        if (block.timestamp < proposal.startTime || block.timestamp > proposal.endTime) {
            revert VotingClosed(proposalId);
        }

        Receipt storage receipt = proposal.receipts[msg.sender];
        if (receipt.hasVoted) revert AlreadyVoted(proposalId, msg.sender);

        uint256 weight = stakedBalance[msg.sender];
        if (weight == 0) revert NoVotingPower();

        receipt.hasVoted = true;
        receipt.support = support;
        receipt.weight = weight;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        if (proposal.endTime > voteLock[msg.sender]) {
            voteLock[msg.sender] = proposal.endTime;
        }

        emit VoteCast(msg.sender, proposalId, support, weight);
    }

    function getReceipt(uint256 proposalId, address voter) external view returns (Receipt memory) {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.id == 0) revert ProposalNotFound(proposalId);
        return proposal.receipts[voter];
    }

    // -------------------- Finalization --------------------

    function checkVoteResult(uint256 proposalId) external returns (bool passed) {
        Proposal storage proposal = _getExistingProposal(proposalId);
        if (proposal.cancelled) revert ProposalAlreadyCancelled(proposalId);
        if (block.timestamp <= proposal.endTime) revert ProposalStillActive(proposalId);
        if (proposal.finalized) revert ProposalAlreadyFinalized(proposalId);

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 snapshot = proposal.totalStakedSnapshot;

        bool meetsQuorum = false;
        if (snapshot > 0 && quorumBps > 0) {
            meetsQuorum = (totalVotes * _ONE_HUNDRED_PERCENT) >= (snapshot * quorumBps);
        } else if (snapshot > 0 && quorumBps == 0) {
            meetsQuorum = true;
        }

        bool meetsApproval = false;
        if (totalVotes > 0) {
            meetsApproval = (proposal.forVotes * _ONE_HUNDRED_PERCENT) >= (totalVotes * approvalThresholdBps);
        }

        passed = meetsQuorum && meetsApproval;
        proposal.passed = passed;
        proposal.finalized = true;

        if (passed) {
            escrow.releaseFunds(proposal.stageIndex);
        }

        emit ProposalFinalized(proposalId, passed, proposal.forVotes, proposal.againstVotes);
        return passed;
    }

    function declareProjectFailed(uint256 proposalId) external {
        Proposal storage proposal = _getExistingProposal(proposalId);
        if (!proposal.finalized) revert ProposalStillActive(proposalId);
        if (proposal.passed) revert ProposalPassed(proposalId);
        if (proposal.cancelled) revert ProposalAlreadyCancelled(proposalId);

        uint256 weight = stakedBalance[msg.sender];
        if (msg.sender != escrow.projectOwner() && weight == 0) revert NotAuthorized();

        escrow.markProjectFailed();
        emit ProjectFailureDeclared(proposalId);
    }

    // -------------------- Views --------------------

    function getProposal(uint256 proposalId) external view returns (ProposalView memory viewData) {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.id == 0) revert ProposalNotFound(proposalId);

        viewData = ProposalView({
            id: proposal.id,
            stageIndex: proposal.stageIndex,
            startTime: proposal.startTime,
            endTime: proposal.endTime,
            forVotes: proposal.forVotes,
            againstVotes: proposal.againstVotes,
            totalStakedSnapshot: proposal.totalStakedSnapshot,
            passed: proposal.passed,
            finalized: proposal.finalized,
            cancelled: proposal.cancelled,
            metadataURI: proposal.metadataURI
        });
    }

    function remainingVoteLock(address voter) external view returns (uint256) {
        uint256 lock = voteLock[voter];
        if (lock <= block.timestamp) return 0;
        return lock - block.timestamp;
    }

    // -------------------- Internals --------------------

    function _getExistingProposal(uint256 proposalId) private view returns (Proposal storage proposal) {
        proposal = _proposals[proposalId];
        if (proposal.id == 0) revert ProposalNotFound(proposalId);
    }
}
