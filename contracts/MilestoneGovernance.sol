// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IFundingEscrow {
    function projectOwner() external view returns (address);
    function fundingGoal() external view returns (uint256);
    function fundsRaised() external view returns (uint256);
    function totalStages() external view returns (uint8);
    function currentStage() external view returns (uint8);
    function contributions(address contributor) external view returns (uint256);
    function isStageReleased(uint256 stageIndex) external view returns (bool);
    function refundsEnabled() external view returns (bool);
    function releaseFunds(uint256 stageIndex) external;
}

/// @title MilestoneGovernance
/// @notice Minimal DAO-style governance layer that verifies milestone completion
/// claims and authorises fund releases from the FundingEscrow contract.
/// Voters are weighted by their contribution share recorded in the escrow.
contract MilestoneGovernance is ReentrancyGuard {
    /// @notice Raised when attempting to interact after refunds have been activated in the escrow.
    error EscrowInactive();

    /// @notice Raised when a function caller lacks the necessary permissions.
    error Unauthorized();

    /// @notice Raised when attempting to vote outside of the active voting window.
    error VotingClosed();

    /// @notice Raised when a voter has already cast a vote on the proposal.
    error AlreadyVoted();

    /// @notice Raised for invalid quorum configuration.
    error InvalidQuorum();

    /// @notice Raised when attempting to create a proposal for an invalid milestone.
    error InvalidStage();

    struct Proposal {
        uint256 stageIndex;
        uint64 votingStart;
        uint64 votingEnd;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        bool cancelled;
        string metadataURI;
    }

    struct Receipt {
        bool hasVoted;
        bool support;
        uint256 votingPower;
    }

    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed stageIndex,
        uint64 votingStart,
        uint64 votingEnd,
        string metadataURI
    );
    event VoteCast(address indexed voter, uint256 indexed proposalId, bool support, uint256 votingPower);
    event ProposalExecuted(uint256 indexed proposalId, uint256 indexed stageIndex, uint256 votesFor, uint256 votesAgainst);
    event ProposalDefeated(uint256 indexed proposalId, uint256 indexed stageIndex, uint256 votesFor, uint256 votesAgainst);
    event ProposalCancelled(uint256 indexed proposalId);

    IFundingEscrow public immutable escrow;
    address public immutable projectOwner;

    uint64 public immutable votingPeriod;
    uint16 public immutable quorumBasisPoints; // 10000 == 100%

    uint256 public proposalCount;

    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => mapping(address => Receipt)) private _receipts;
    mapping(uint256 => uint256) public latestProposalIdByStage;

    constructor(IFundingEscrow _escrow, uint64 _votingPeriod, uint16 _quorumBasisPoints) {
        if (address(_escrow) == address(0)) revert Unauthorized();
        if (_votingPeriod == 0) revert("Voting period is zero");
        if (_quorumBasisPoints == 0 || _quorumBasisPoints > 10000) revert InvalidQuorum();

        escrow = _escrow;
        projectOwner = _escrow.projectOwner();
        votingPeriod = _votingPeriod;
        quorumBasisPoints = _quorumBasisPoints;
    }

    modifier onlyProjectOwner() {
        if (msg.sender != projectOwner) revert Unauthorized();
        _;
    }

    /// @notice Creates a new milestone verification proposal.
    /// @param stageIndex Index of the milestone to verify (must match the next pending stage in the escrow).
    /// @param metadataURI Off-chain reference (IPFS/Arweave) to evidence supplied by the project owner.
    function createMilestoneProposal(uint256 stageIndex, string calldata metadataURI)
        external
        onlyProjectOwner
        returns (uint256 proposalId)
    {
        if (escrow.refundsEnabled()) revert EscrowInactive();
        if (stageIndex >= escrow.totalStages()) revert InvalidStage();

        uint256 previousProposalId = latestProposalIdByStage[stageIndex];
        if (previousProposalId != 0) {
            Proposal storage previous = _proposals[previousProposalId];
            if (!previous.executed && !previous.cancelled) revert("Active proposal exists");
        }

        uint8 pendingStage = escrow.currentStage();
        if (stageIndex != uint256(pendingStage)) revert InvalidStage();
        if (escrow.isStageReleased(stageIndex)) revert InvalidStage();

        if (escrow.fundsRaised() < escrow.fundingGoal()) revert("Funding goal not met");

        proposalId = ++proposalCount;

        Proposal storage proposal = _proposals[proposalId];
        proposal.stageIndex = stageIndex;
        proposal.votingStart = uint64(block.timestamp);
        proposal.votingEnd = uint64(block.timestamp + votingPeriod);
        proposal.metadataURI = metadataURI;

        latestProposalIdByStage[stageIndex] = proposalId;

        emit ProposalCreated(proposalId, stageIndex, proposal.votingStart, proposal.votingEnd, metadataURI);
    }

    /// @notice Casts a vote for or against a milestone proposal.
    /// @param proposalId Identifier of the proposal.
    /// @param support True to vote in favour, false to reject.
    function vote(uint256 proposalId, bool support) external {
        if (escrow.refundsEnabled()) revert EscrowInactive();

        Proposal storage proposal = _proposals[proposalId];
        if (proposal.votingStart == 0) revert("Proposal not found");
        if (block.timestamp < proposal.votingStart || block.timestamp > proposal.votingEnd) revert VotingClosed();
        if (proposal.executed || proposal.cancelled) revert VotingClosed();

        Receipt storage receipt = _receipts[proposalId][msg.sender];
        if (receipt.hasVoted) revert AlreadyVoted();

        uint256 votingPower = escrow.contributions(msg.sender);
        require(votingPower > 0, "No voting power");

        receipt.hasVoted = true;
        receipt.support = support;
        receipt.votingPower = votingPower;

        if (support) {
            proposal.votesFor += votingPower;
        } else {
            proposal.votesAgainst += votingPower;
        }

        emit VoteCast(msg.sender, proposalId, support, votingPower);
    }

    /// @notice Finalises a proposal after the voting period and triggers the associated escrow action.
    /// @param proposalId Identifier of the proposal to finalise.
    function checkVoteResult(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.votingStart == 0) revert("Proposal not found");
        if (proposal.executed) revert("Already finalised");
        if (proposal.cancelled) revert("Proposal cancelled");
        if (block.timestamp <= proposal.votingEnd) revert("Voting still active");

        uint256 forVotes = proposal.votesFor;
        uint256 againstVotes = proposal.votesAgainst;
        uint256 totalVotes = forVotes + againstVotes;

        uint256 totalVotingPower = escrow.fundsRaised();
        uint256 quorumVotes = (totalVotingPower * quorumBasisPoints) / 10000;

        bool quorumReached = totalVotes >= quorumVotes;
        bool majorityInFavor = forVotes > againstVotes;

        if (quorumReached && majorityInFavor) {
            proposal.executed = true;
            escrow.releaseFunds(proposal.stageIndex);
            emit ProposalExecuted(proposalId, proposal.stageIndex, forVotes, againstVotes);
        } else {
            proposal.executed = true;
            emit ProposalDefeated(proposalId, proposal.stageIndex, forVotes, againstVotes);
        }
    }

    /// @notice Cancels a proposal before it has been finalised.
    /// @param proposalId Identifier of the proposal to cancel.
    function cancelProposal(uint256 proposalId) external onlyProjectOwner {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.votingStart == 0) revert("Proposal not found");
        if (proposal.executed || proposal.cancelled) revert("Already finalised");

        proposal.cancelled = true;
        emit ProposalCancelled(proposalId);
    }

    /// @notice Retrieves core metadata for a given proposal.
    function getProposal(uint256 proposalId)
        external
        view
        returns (
            uint256 stageIndex,
            uint64 votingStart,
            uint64 votingEnd,
            uint256 votesFor,
            uint256 votesAgainst,
            bool executed,
            bool cancelled,
            string memory metadataURI
        )
    {
        Proposal storage proposal = _proposals[proposalId];
        stageIndex = proposal.stageIndex;
        votingStart = proposal.votingStart;
        votingEnd = proposal.votingEnd;
        votesFor = proposal.votesFor;
        votesAgainst = proposal.votesAgainst;
        executed = proposal.executed;
        cancelled = proposal.cancelled;
        metadataURI = proposal.metadataURI;
    }

    /// @notice Returns the stored vote receipt for a voter and proposal.
    function getReceipt(uint256 proposalId, address voter)
        external
        view
        returns (bool hasVoted, bool support, uint256 votingPower)
    {
        Receipt storage receipt = _receipts[proposalId][voter];
        hasVoted = receipt.hasVoted;
        support = receipt.support;
        votingPower = receipt.votingPower;
    }
}
