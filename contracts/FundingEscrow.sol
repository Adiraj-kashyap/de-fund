// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FundingEscrow
 * @dev Manages the escrow of funds for milestone-based crowdfunding projects
 * Implements all-or-nothing funding model with milestone-based releases
 */
contract FundingEscrow is Ownable, ReentrancyGuard {
    // Project state
    address public projectOwner;
    uint256 public fundingGoal;
    uint256 public deadline;
    uint256 public totalStages;
    uint256 public currentStage;
    uint256 public fundsRaised;
    bool public fundingGoalMet;
    bool public projectFailed;
    
    // Stage-based fund allocation
    mapping(uint256 => uint256) public fundsAllocatedPerStage;
    mapping(uint256 => bool) public stageFundsReleased;
    
    // Donor tracking
    mapping(address => uint256) public donations;
    address[] public donors;
    
    // Governance contract reference
    address public governanceContract;
    
    // Events
    event FundsDonated(address indexed donor, uint256 amount, uint256 totalRaised);
    event FundsReleased(uint256 indexed stage, uint256 amount);
    event RefundIssued(address indexed donor, uint256 amount);
    event FundingGoalMet(uint256 totalRaised);
    event GovernanceContractSet(address indexed governanceContract);
    event ProjectFailed();
    
    // Modifiers
    modifier onlyGovernance() {
        require(msg.sender == governanceContract, "Only governance contract can call this");
        _;
    }
    
    modifier onlyBeforeDeadline() {
        require(block.timestamp < deadline, "Funding deadline has passed");
        _;
    }
    
    modifier onlyAfterDeadline() {
        require(block.timestamp >= deadline, "Funding deadline has not passed");
        _;
    }
    
    /**
     * @dev Constructor initializes the funding escrow
     * @param _projectOwner Address of the project creator
     * @param _fundingGoal Total funding goal in wei
     * @param _deadline Unix timestamp when funding period ends
     * @param _totalStages Number of milestones/stages in the project
     * @param _fundsAllocatedPerStage Array of fund allocations per stage (must sum to fundingGoal)
     */
    constructor(
        address _projectOwner,
        uint256 _fundingGoal,
        uint256 _deadline,
        uint256 _totalStages,
        uint256[] memory _fundsAllocatedPerStage
    ) Ownable(msg.sender) {
        require(_projectOwner != address(0), "Project owner cannot be zero address");
        require(_fundingGoal > 0, "Funding goal must be greater than zero");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_totalStages > 0, "Must have at least one stage");
        require(_fundsAllocatedPerStage.length == _totalStages, "Allocation array length mismatch");
        
        uint256 totalAllocated = 0;
        for (uint256 i = 0; i < _totalStages; i++) {
            require(_fundsAllocatedPerStage[i] > 0, "Each stage must have allocation > 0");
            fundsAllocatedPerStage[i] = _fundsAllocatedPerStage[i];
            totalAllocated += _fundsAllocatedPerStage[i];
        }
        require(totalAllocated == _fundingGoal, "Stage allocations must sum to funding goal");
        
        projectOwner = _projectOwner;
        fundingGoal = _fundingGoal;
        deadline = _deadline;
        totalStages = _totalStages;
        currentStage = 0;
        fundsRaised = 0;
        fundingGoalMet = false;
        projectFailed = false;
    }
    
    /**
     * @dev Allows users to donate ETH to the project
     * Only callable before deadline and if funding goal not yet met
     */
    function donate() external payable onlyBeforeDeadline nonReentrant {
        require(!fundingGoalMet || fundsRaised < fundingGoal, "Funding goal already met");
        require(msg.value > 0, "Donation must be greater than zero");
        
        // Track donor if first donation
        if (donations[msg.sender] == 0) {
            donors.push(msg.sender);
        }
        
        donations[msg.sender] += msg.value;
        fundsRaised += msg.value;
        
        emit FundsDonated(msg.sender, msg.value, fundsRaised);
        
        // Check if funding goal is met
        if (fundsRaised >= fundingGoal && !fundingGoalMet) {
            fundingGoalMet = true;
            emit FundingGoalMet(fundsRaised);
        }
    }
    
    /**
     * @dev Releases funds for a specific milestone/stage
     * Only callable by the governance contract after successful vote
     * @param _stageIndex Index of the stage (0-based)
     */
    function releaseFunds(uint256 _stageIndex) external onlyGovernance nonReentrant {
        require(fundingGoalMet, "Funding goal must be met before releasing funds");
        require(_stageIndex < totalStages, "Invalid stage index");
        require(_stageIndex == currentStage, "Can only release funds for current stage");
        require(!stageFundsReleased[_stageIndex], "Funds for this stage already released");
        require(!projectFailed, "Project has failed");
        
        uint256 amountToRelease = fundsAllocatedPerStage[_stageIndex];
        require(address(this).balance >= amountToRelease, "Insufficient contract balance");
        
        stageFundsReleased[_stageIndex] = true;
        currentStage++;
        
        (bool success, ) = projectOwner.call{value: amountToRelease}("");
        require(success, "Fund transfer failed");
        
        emit FundsReleased(_stageIndex, amountToRelease);
    }
    
    /**
     * @dev Refunds all donations if funding goal not met by deadline
     * Or if project is marked as failed by governance
     */
    function refund() external nonReentrant {
        require(
            (!fundingGoalMet && block.timestamp >= deadline) || projectFailed,
            "Refund conditions not met"
        );
        
        // Refund all donors
        for (uint256 i = 0; i < donors.length; i++) {
            address donor = donors[i];
            uint256 donationAmount = donations[donor];
            
            if (donationAmount > 0) {
                donations[donor] = 0;
                (bool success, ) = donor.call{value: donationAmount}("");
                require(success, "Refund transfer failed");
                emit RefundIssued(donor, donationAmount);
            }
        }
    }
    
    /**
     * @dev Allows governance to mark project as failed
     * This enables refunds to be issued
     */
    function markProjectAsFailed() external onlyGovernance {
        require(!projectFailed, "Project already marked as failed");
        projectFailed = true;
        emit ProjectFailed();
    }
    
    /**
     * @dev Sets the governance contract address
     * Can only be set once by the contract owner
     * @param _governanceContract Address of the MilestoneGovernance contract
     */
    function setGovernanceContract(address _governanceContract) external onlyOwner {
        require(_governanceContract != address(0), "Governance contract cannot be zero address");
        require(governanceContract == address(0), "Governance contract already set");
        governanceContract = _governanceContract;
        emit GovernanceContractSet(_governanceContract);
    }
    
    /**
     * @dev Returns the contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Returns the number of donors
     */
    function getDonorCount() external view returns (uint256) {
        return donors.length;
    }
    
    /**
     * @dev Returns all donor addresses
     */
    function getAllDonors() external view returns (address[] memory) {
        return donors;
    }
    
    /**
     * @dev Returns funding progress percentage (scaled by 100)
     */
    function getFundingProgress() external view returns (uint256) {
        if (fundingGoal == 0) return 0;
        return (fundsRaised * 100) / fundingGoal;
    }
}
