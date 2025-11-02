// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./FundingEscrow.sol";

/**
 * @title MilestoneGovernance
 * @dev Implements DAO-based voting mechanism for milestone verification
 * @notice Governance token holders vote on milestone completion claims
 */
contract MilestoneGovernance is ReentrancyGuard {
    // Proposal status enum
    enum ProposalStatus {
        Pending,
        Active,
        Approved,
        Rejected,
        Executed
    }
    
    // Proposal struct
    struct Proposal {
        uint256 id;
        uint256 stageIndex;
        address projectOwner;
        address escrowContract;
        string evidenceHash; // IPFS hash of milestone evidence
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        uint256 endTime;
        ProposalStatus status;
        bool executed;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voterStake;
    }
    
    // Voter information
    struct Voter {
        uint256 stakedAmount;
        uint256 reputation;
        bool isRegistered;
    }
    
    // State variables
    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant MINIMUM_STAKE = 0.01 ether; // Minimum stake to vote
    uint256 public constant QUORUM_PERCENTAGE = 51; // 51% quorum required
    
    // Governance token (optional - can use ETH staking or ERC20)
    IERC20 public governanceToken;
    bool public useTokenStaking;
    
    // Mappings
    mapping(uint256 => Proposal) public proposals;
    mapping(address => Voter) public voters;
    mapping(address => uint256[]) public voterProposals;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed stageIndex,
        address indexed escrowContract,
        string evidenceHash
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool inFavor,
        uint256 weight
    );
    event ProposalApproved(uint256 indexed proposalId, uint256 votesFor, uint256 votesAgainst);
    event ProposalRejected(uint256 indexed proposalId, uint256 votesFor, uint256 votesAgainst);
    event ProposalExecuted(uint256 indexed proposalId, bool success);
    event VoterRegistered(address indexed voter, uint256 stakedAmount);
    event StakeAdded(address indexed voter, uint256 amount, uint256 totalStake);
    event StakeWithdrawn(address indexed voter, uint256 amount);
    
    // Modifiers
    modifier onlyRegisteredVoter() {
        require(voters[msg.sender].isRegistered, "Not a registered voter");
        require(voters[msg.sender].stakedAmount >= MINIMUM_STAKE, "Insufficient stake");
        _;
    }
    
    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId < proposalCount, "Proposal does not exist");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _governanceToken Address of governance token (address(0) for ETH staking)
     */
    constructor(address _governanceToken) {
        if (_governanceToken != address(0)) {
            governanceToken = IERC20(_governanceToken);
            useTokenStaking = true;
        } else {
            useTokenStaking = false;
        }
    }
    
    /**
     * @dev Register as a voter by staking ETH or tokens
     */
    function registerVoter() external payable {
        require(!voters[msg.sender].isRegistered, "Already registered");
        
        if (useTokenStaking) {
            revert("Use registerVoterWithTokens() for token-based governance");
        } else {
            require(msg.value >= MINIMUM_STAKE, "Insufficient stake amount");
            voters[msg.sender] = Voter({
                stakedAmount: msg.value,
                reputation: 100, // Initial reputation score
                isRegistered: true
            });
        }
        
        emit VoterRegistered(msg.sender, msg.value);
    }
    
    /**
     * @dev Register as a voter by staking governance tokens
     * @param _amount Amount of tokens to stake
     */
    function registerVoterWithTokens(uint256 _amount) external {
        require(useTokenStaking, "This governance uses ETH staking");
        require(!voters[msg.sender].isRegistered, "Already registered");
        require(_amount >= MINIMUM_STAKE, "Insufficient stake amount");
        
        require(
            governanceToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );
        
        voters[msg.sender] = Voter({
            stakedAmount: _amount,
            reputation: 100,
            isRegistered: true
        });
        
        emit VoterRegistered(msg.sender, _amount);
    }
    
    /**
     * @dev Add additional stake to increase voting power
     */
    function addStake() external payable onlyRegisteredVoter {
        require(!useTokenStaking, "Use addStakeWithTokens() for token-based governance");
        require(msg.value > 0, "Must stake a positive amount");
        
        voters[msg.sender].stakedAmount += msg.value;
        emit StakeAdded(msg.sender, msg.value, voters[msg.sender].stakedAmount);
    }
    
    /**
     * @dev Add additional token stake
     * @param _amount Amount of tokens to stake
     */
    function addStakeWithTokens(uint256 _amount) external onlyRegisteredVoter {
        require(useTokenStaking, "This governance uses ETH staking");
        require(_amount > 0, "Must stake a positive amount");
        
        require(
            governanceToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );
        
        voters[msg.sender].stakedAmount += _amount;
        emit StakeAdded(msg.sender, _amount, voters[msg.sender].stakedAmount);
    }
    
    /**
     * @dev Create a new milestone completion proposal
     * @param _escrowContract Address of the FundingEscrow contract
     * @param _stageIndex Index of the milestone stage
     * @param _evidenceHash IPFS hash of the evidence for milestone completion
     */
    function createMilestoneProposal(
        address _escrowContract,
        uint256 _stageIndex,
        string memory _evidenceHash
    ) external returns (uint256) {
        require(_escrowContract != address(0), "Invalid escrow address");
        require(bytes(_evidenceHash).length > 0, "Evidence hash required");
        
        FundingEscrow escrow = FundingEscrow(payable(_escrowContract));
        require(msg.sender == escrow.projectOwner(), "Only project owner can create proposal");
        require(escrow.fundingGoalReached(), "Funding goal not reached");
        require(!escrow.stageCompleted(_stageIndex), "Stage already completed");
        require(_stageIndex == escrow.currentStage(), "Must complete stages in order");
        
        uint256 proposalId = proposalCount++;
        Proposal storage newProposal = proposals[proposalId];
        
        newProposal.id = proposalId;
        newProposal.stageIndex = _stageIndex;
        newProposal.projectOwner = msg.sender;
        newProposal.escrowContract = _escrowContract;
        newProposal.evidenceHash = _evidenceHash;
        newProposal.votesFor = 0;
        newProposal.votesAgainst = 0;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + VOTING_PERIOD;
        newProposal.status = ProposalStatus.Active;
        newProposal.executed = false;
        
        emit ProposalCreated(proposalId, _stageIndex, _escrowContract, _evidenceHash);
        
        return proposalId;
    }
    
    /**
     * @dev Cast a vote on a milestone proposal
     * @param _proposalId ID of the proposal to vote on
     * @param _inFavor True to vote for approval, false to vote against
     */
    function vote(uint256 _proposalId, bool _inFavor) 
        external 
        onlyRegisteredVoter 
        proposalExists(_proposalId) 
        nonReentrant 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp <= proposal.endTime, "Voting period ended");
        require(!proposal.hasVoted[msg.sender], "Already voted on this proposal");
        
        // Calculate voting weight (stake + reputation)
        uint256 votingWeight = voters[msg.sender].stakedAmount + 
                               (voters[msg.sender].reputation * 1 ether / 100);
        
        proposal.hasVoted[msg.sender] = true;
        proposal.voterStake[msg.sender] = voters[msg.sender].stakedAmount;
        voterProposals[msg.sender].push(_proposalId);
        
        if (_inFavor) {
            proposal.votesFor += votingWeight;
        } else {
            proposal.votesAgainst += votingWeight;
        }
        
        emit VoteCast(_proposalId, msg.sender, _inFavor, votingWeight);
    }
    
    /**
     * @dev Check and execute the result of a vote
     * @param _proposalId ID of the proposal to check
     */
    function executeProposal(uint256 _proposalId) 
        external 
        proposalExists(_proposalId) 
        nonReentrant 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp > proposal.endTime, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        FundingEscrow escrow = FundingEscrow(payable(proposal.escrowContract));
        uint256 totalStaked = address(this).balance;
        
        // Check quorum (51% of staked tokens must participate)
        bool quorumReached = (totalVotes * 100) >= (totalStaked * QUORUM_PERCENTAGE);
        
        if (quorumReached && proposal.votesFor > proposal.votesAgainst) {
            // Proposal approved
            proposal.status = ProposalStatus.Approved;
            proposal.executed = true;
            
            // Release funds from escrow
            try escrow.releaseFunds(proposal.stageIndex) {
                emit ProposalApproved(_proposalId, proposal.votesFor, proposal.votesAgainst);
                emit ProposalExecuted(_proposalId, true);
            } catch {
                proposal.status = ProposalStatus.Rejected;
                emit ProposalExecuted(_proposalId, false);
            }
        } else {
            // Proposal rejected
            proposal.status = ProposalStatus.Rejected;
            proposal.executed = true;
            emit ProposalRejected(_proposalId, proposal.votesFor, proposal.votesAgainst);
        }
    }
    
    /**
     * @dev Withdraw stake (only if no active votes)
     */
    function withdrawStake() external onlyRegisteredVoter nonReentrant {
        uint256 stakedAmount = voters[msg.sender].stakedAmount;
        require(stakedAmount > 0, "No stake to withdraw");
        
        // Check if voter has any active proposals they voted on
        uint256[] memory userProposals = voterProposals[msg.sender];
        for (uint256 i = 0; i < userProposals.length; i++) {
            Proposal storage proposal = proposals[userProposals[i]];
            require(
                proposal.status != ProposalStatus.Active,
                "Cannot withdraw while having active votes"
            );
        }
        
        voters[msg.sender].stakedAmount = 0;
        voters[msg.sender].isRegistered = false;
        
        if (useTokenStaking) {
            require(
                governanceToken.transfer(msg.sender, stakedAmount),
                "Token transfer failed"
            );
        } else {
            (bool success, ) = payable(msg.sender).call{value: stakedAmount}("");
            require(success, "ETH transfer failed");
        }
        
        emit StakeWithdrawn(msg.sender, stakedAmount);
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 _proposalId) 
        external 
        view 
        proposalExists(_proposalId) 
        returns (
            uint256 id,
            uint256 stageIndex,
            address projectOwner,
            address escrowContract,
            string memory evidenceHash,
            uint256 votesFor,
            uint256 votesAgainst,
            uint256 startTime,
            uint256 endTime,
            ProposalStatus status,
            bool executed
        ) 
    {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.stageIndex,
            proposal.projectOwner,
            proposal.escrowContract,
            proposal.evidenceHash,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.startTime,
            proposal.endTime,
            proposal.status,
            proposal.executed
        );
    }
    
    /**
     * @dev Check if an address has voted on a proposal
     */
    function hasVoted(uint256 _proposalId, address _voter) 
        external 
        view 
        proposalExists(_proposalId) 
        returns (bool) 
    {
        return proposals[_proposalId].hasVoted[_voter];
    }
    
    /**
     * @dev Get voter information
     */
    function getVoterInfo(address _voter) 
        external 
        view 
        returns (
            uint256 stakedAmount,
            uint256 reputation,
            bool isRegistered,
            uint256 proposalCount
        ) 
    {
        Voter memory voter = voters[_voter];
        return (
            voter.stakedAmount,
            voter.reputation,
            voter.isRegistered,
            voterProposals[_voter].length
        );
    }
    
    /**
     * @dev Get total staked amount in the contract
     */
    function getTotalStaked() external view returns (uint256) {
        if (useTokenStaking) {
            return governanceToken.balanceOf(address(this));
        } else {
            return address(this).balance;
        }
    }
}
