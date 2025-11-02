// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./FundingEscrow.sol";

/**
 * @title MilestoneGovernance
 * @dev DAO-based governance system for milestone verification
 * Uses a governance token for voting on milestone completion
 */
contract MilestoneGovernance is Ownable {
    // Governance token
    ERC20 public governanceToken;
    
    // Escrow contract reference
    FundingEscrow public escrowContract;
    
    // Proposal structure
    struct Proposal {
        uint256 stageIndex;
        string evidenceHash; // IPFS hash or link to evidence
        address proposer; // Project owner
        uint256 votingDeadline;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        bool passed;
    }
    
    // Proposal tracking
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public voteWeight; // Track vote weight per voter
    
    uint256 public proposalCount;
    uint256 public votingPeriod; // Duration in seconds
    
    // Staking mechanism for voters
    mapping(address => uint256) public stakedTokens;
    uint256 public minimumStake; // Minimum tokens required to vote
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed stageIndex,
        address indexed proposer,
        string evidenceHash,
        uint256 votingDeadline
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool inFavor,
        uint256 weight
    );
    event ProposalExecuted(uint256 indexed proposalId, bool passed);
    event TokensStaked(address indexed voter, uint256 amount);
    event TokensUnstaked(address indexed voter, uint256 amount);
    
    // Modifiers
    modifier onlyProjectOwner() {
        require(msg.sender == escrowContract.projectOwner(), "Only project owner can call this");
        _;
    }
    
    modifier validProposal(uint256 _proposalId) {
        require(_proposalId < proposalCount, "Invalid proposal ID");
        _;
    }
    
    /**
     * @dev Constructor initializes the governance system
     * @param _governanceToken Address of the ERC20 governance token
     * @param _votingPeriod Duration of voting period in seconds (e.g., 7 days = 604800)
     * @param _minimumStake Minimum tokens required to stake and vote
     */
    constructor(
        address _governanceToken,
        uint256 _votingPeriod,
        uint256 _minimumStake
    ) Ownable(msg.sender) {
        require(_governanceToken != address(0), "Governance token cannot be zero address");
        require(_votingPeriod > 0, "Voting period must be greater than zero");
        
        governanceToken = ERC20(_governanceToken);
        votingPeriod = _votingPeriod;
        minimumStake = _minimumStake;
        proposalCount = 0;
    }
    
    /**
     * @dev Sets the escrow contract address
     * @param _escrowContract Address of the FundingEscrow contract
     */
    function setEscrowContract(address _escrowContract) external onlyOwner {
        require(_escrowContract != address(0), "Escrow contract cannot be zero address");
        escrowContract = FundingEscrow(_escrowContract);
    }
    
    /**
     * @dev Creates a new milestone completion proposal
     * Only callable by the project owner
     * @param _stageIndex Index of the milestone/stage being claimed as complete
     * @param _evidenceHash IPFS hash or link to evidence of milestone completion
     */
    function createMilestoneProposal(
        uint256 _stageIndex,
        string memory _evidenceHash
    ) external onlyProjectOwner returns (uint256) {
        require(address(escrowContract) != address(0), "Escrow contract not set");
        require(
            bytes(_evidenceHash).length > 0,
            "Evidence hash cannot be empty"
        );
        
        uint256 proposalId = proposalCount;
        
        proposals[proposalId] = Proposal({
            stageIndex: _stageIndex,
            evidenceHash: _evidenceHash,
            proposer: msg.sender,
            votingDeadline: block.timestamp + votingPeriod,
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            passed: false
        });
        
        proposalCount++;
        
        emit ProposalCreated(
            proposalId,
            _stageIndex,
            msg.sender,
            _evidenceHash,
            proposals[proposalId].votingDeadline
        );
        
        return proposalId;
    }
    
    /**
     * @dev Allows governance token holders to vote on a proposal
     * Voters must have staked tokens to participate
     * @param _proposalId ID of the proposal to vote on
     * @param _inFavor true for approval, false for rejection
     */
    function vote(uint256 _proposalId, bool _inFavor) external validProposal(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        
        require(block.timestamp < proposal.votingDeadline, "Voting deadline has passed");
        require(!proposal.executed, "Proposal already executed");
        require(!hasVoted[_proposalId][msg.sender], "Already voted on this proposal");
        require(stakedTokens[msg.sender] >= minimumStake, "Insufficient staked tokens");
        
        uint256 votingPower = stakedTokens[msg.sender];
        
        hasVoted[_proposalId][msg.sender] = true;
        voteWeight[_proposalId][msg.sender] = votingPower;
        
        if (_inFavor) {
            proposal.votesFor += votingPower;
        } else {
            proposal.votesAgainst += votingPower;
        }
        
        emit VoteCast(_proposalId, msg.sender, _inFavor, votingPower);
    }
    
    /**
     * @dev Checks vote result and executes the proposal if passed
     * Can be called by anyone after voting deadline
     * @param _proposalId ID of the proposal to check
     */
    function checkVoteResult(uint256 _proposalId) external validProposal(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        
        require(block.timestamp >= proposal.votingDeadline, "Voting period still active");
        require(!proposal.executed, "Proposal already executed");
        
        proposal.executed = true;
        
        // Proposal passes if votesFor > votesAgainst and at least 30% of staked tokens voted
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        uint256 totalStaked = governanceToken.totalSupply();
        uint256 quorumThreshold = (totalStaked * 30) / 100; // 30% quorum
        
        if (proposal.votesFor > proposal.votesAgainst && totalVotes >= quorumThreshold) {
            proposal.passed = true;
            
            // Release funds for the milestone
            escrowContract.releaseFunds(proposal.stageIndex);
        } else {
            proposal.passed = false;
        }
        
        emit ProposalExecuted(_proposalId, proposal.passed);
    }
    
    /**
     * @dev Allows users to stake governance tokens to participate in voting
     * @param _amount Amount of tokens to stake
     */
    function stakeTokens(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than zero");
        require(
            governanceToken.balanceOf(msg.sender) >= _amount,
            "Insufficient token balance"
        );
        
        require(
            governanceToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );
        
        stakedTokens[msg.sender] += _amount;
        
        emit TokensStaked(msg.sender, _amount);
    }
    
    /**
     * @dev Allows users to unstake their governance tokens
     * @param _amount Amount of tokens to unstake
     */
    function unstakeTokens(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than zero");
        require(stakedTokens[msg.sender] >= _amount, "Insufficient staked tokens");
        
        stakedTokens[msg.sender] -= _amount;
        
        require(
            governanceToken.transfer(msg.sender, _amount),
            "Token transfer failed"
        );
        
        emit TokensUnstaked(msg.sender, _amount);
    }
    
    /**
     * @dev Returns proposal details
     * @param _proposalId ID of the proposal
     */
    function getProposal(uint256 _proposalId)
        external
        view
        validProposal(_proposalId)
        returns (
            uint256 stageIndex,
            string memory evidenceHash,
            address proposer,
            uint256 votingDeadline,
            uint256 votesFor,
            uint256 votesAgainst,
            bool executed,
            bool passed
        )
    {
        Proposal memory proposal = proposals[_proposalId];
        return (
            proposal.stageIndex,
            proposal.evidenceHash,
            proposal.proposer,
            proposal.votingDeadline,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.executed,
            proposal.passed
        );
    }
    
    /**
     * @dev Returns total staked tokens
     */
    function getTotalStaked() external view returns (uint256) {
        return governanceToken.balanceOf(address(this));
    }
}
