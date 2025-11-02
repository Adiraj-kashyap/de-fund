// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FundingEscrow
 * @dev Manages milestone-based fund escrow for decentralized crowdfunding
 * @notice This contract holds funds in escrow and releases them upon milestone verification
 */
contract FundingEscrow is ReentrancyGuard, Ownable {
    // State variables
    address public projectOwner;
    address public governanceContract;
    uint256 public fundingGoal;
    uint256 public fundingDeadline;
    uint256 public fundsRaised;
    uint256 public totalStages;
    uint256 public currentStage;
    bool public fundingGoalReached;
    bool public projectCancelled;
    
    // Mapping of stage index to funds allocated for that stage
    mapping(uint256 => uint256) public fundsAllocatedPerStage;
    
    // Mapping of stage index to whether funds have been released
    mapping(uint256 => bool) public stageCompleted;
    
    // Mapping of donor addresses to their contribution amounts
    mapping(address => uint256) public contributions;
    
    // Array to track all donors for refund purposes
    address[] public donors;
    mapping(address => bool) public isDonor;
    
    // Events
    event DonationReceived(address indexed donor, uint256 amount, uint256 totalRaised);
    event FundingGoalReached(uint256 totalAmount, uint256 timestamp);
    event FundsReleased(uint256 indexed stageIndex, uint256 amount, address indexed recipient);
    event RefundIssued(address indexed donor, uint256 amount);
    event ProjectCancelled(uint256 timestamp);
    event GovernanceContractSet(address indexed governanceAddress);
    
    // Modifiers
    modifier onlyGovernance() {
        require(msg.sender == governanceContract, "Only governance contract can call this");
        _;
    }
    
    modifier onlyProjectOwner() {
        require(msg.sender == projectOwner, "Only project owner can call this");
        _;
    }
    
    modifier fundingActive() {
        require(block.timestamp < fundingDeadline, "Funding period has ended");
        require(!fundingGoalReached, "Funding goal already reached");
        require(!projectCancelled, "Project has been cancelled");
        _;
    }
    
    /**
     * @dev Constructor to initialize the funding escrow
     * @param _projectOwner Address of the project owner
     * @param _fundingGoal Total funding goal in wei
     * @param _fundingDuration Duration of funding period in seconds
     * @param _totalStages Total number of milestone stages
     * @param _stageAllocations Array of fund allocations per stage (must sum to 100%)
     */
    constructor(
        address _projectOwner,
        uint256 _fundingGoal,
        uint256 _fundingDuration,
        uint256 _totalStages,
        uint256[] memory _stageAllocations
    ) Ownable(msg.sender) {
        require(_projectOwner != address(0), "Invalid project owner address");
        require(_fundingGoal > 0, "Funding goal must be greater than 0");
        require(_totalStages >= 3 && _totalStages <= 7, "Total stages must be between 3 and 7");
        require(_stageAllocations.length == _totalStages, "Stage allocations must match total stages");
        
        // Validate that allocations sum to 100% (10000 basis points)
        uint256 totalAllocation = 0;
        for (uint256 i = 0; i < _stageAllocations.length; i++) {
            require(_stageAllocations[i] > 0, "Each stage must have allocation");
            totalAllocation += _stageAllocations[i];
            fundsAllocatedPerStage[i] = _stageAllocations[i];
        }
        require(totalAllocation == 10000, "Total allocation must equal 10000 (100%)");
        
        projectOwner = _projectOwner;
        fundingGoal = _fundingGoal;
        fundingDeadline = block.timestamp + _fundingDuration;
        totalStages = _totalStages;
        currentStage = 0;
        fundingGoalReached = false;
        projectCancelled = false;
    }
    
    /**
     * @dev Set the governance contract address (can only be set once)
     * @param _governanceContract Address of the MilestoneGovernance contract
     */
    function setGovernanceContract(address _governanceContract) external onlyOwner {
        require(governanceContract == address(0), "Governance contract already set");
        require(_governanceContract != address(0), "Invalid governance address");
        governanceContract = _governanceContract;
        emit GovernanceContractSet(_governanceContract);
    }
    
    /**
     * @dev Allows users to donate ETH to the project
     * @notice Funds are held in escrow until milestones are verified
     */
    function donate() external payable fundingActive nonReentrant {
        require(msg.value > 0, "Donation must be greater than 0");
        
        // Track donor if first-time contributor
        if (!isDonor[msg.sender]) {
            donors.push(msg.sender);
            isDonor[msg.sender] = true;
        }
        
        contributions[msg.sender] += msg.value;
        fundsRaised += msg.value;
        
        emit DonationReceived(msg.sender, msg.value, fundsRaised);
        
        // Check if funding goal is reached
        if (fundsRaised >= fundingGoal && !fundingGoalReached) {
            fundingGoalReached = true;
            emit FundingGoalReached(fundsRaised, block.timestamp);
        }
    }
    
    /**
     * @dev Releases funds for a specific milestone stage
     * @param _stageIndex Index of the milestone stage to release funds for
     * @notice Can only be called by the governance contract after successful vote
     */
    function releaseFunds(uint256 _stageIndex) external onlyGovernance nonReentrant {
        require(fundingGoalReached, "Funding goal not reached");
        require(_stageIndex < totalStages, "Invalid stage index");
        require(!stageCompleted[_stageIndex], "Funds already released for this stage");
        require(_stageIndex == currentStage, "Must complete stages in order");
        require(!projectCancelled, "Project has been cancelled");
        
        // Calculate amount to release (percentage of total funds raised)
        uint256 amountToRelease = (fundsRaised * fundsAllocatedPerStage[_stageIndex]) / 10000;
        require(address(this).balance >= amountToRelease, "Insufficient contract balance");
        
        // Mark stage as completed
        stageCompleted[_stageIndex] = true;
        currentStage++;
        
        // Transfer funds to project owner
        (bool success, ) = payable(projectOwner).call{value: amountToRelease}("");
        require(success, "Fund transfer failed");
        
        emit FundsReleased(_stageIndex, amountToRelease, projectOwner);
    }
    
    /**
     * @dev Issues refunds to all donors
     * @notice Called when funding goal is not met or project is cancelled
     */
    function refund() external nonReentrant {
        require(
            (block.timestamp >= fundingDeadline && !fundingGoalReached) || projectCancelled,
            "Refund conditions not met"
        );
        
        uint256 refundAmount = contributions[msg.sender];
        require(refundAmount > 0, "No contribution to refund");
        
        contributions[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund transfer failed");
        
        emit RefundIssued(msg.sender, refundAmount);
    }
    
    /**
     * @dev Cancels the project and enables refunds
     * @notice Can be called by governance contract in case of project failure
     */
    function cancelProject() external onlyGovernance {
        require(!projectCancelled, "Project already cancelled");
        projectCancelled = true;
        emit ProjectCancelled(block.timestamp);
    }
    
    /**
     * @dev Returns the current contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Returns the number of donors
     */
    function getDonorCount() external view returns (uint256) {
        return donors.length;
    }
    
    /**
     * @dev Returns donor address at specific index
     */
    function getDonor(uint256 index) external view returns (address) {
        require(index < donors.length, "Index out of bounds");
        return donors[index];
    }
    
    /**
     * @dev Returns the amount allocated for a specific stage
     */
    function getStageAllocation(uint256 _stageIndex) external view returns (uint256) {
        require(_stageIndex < totalStages, "Invalid stage index");
        return (fundsRaised * fundsAllocatedPerStage[_stageIndex]) / 10000;
    }
    
    /**
     * @dev Returns project status information
     */
    function getProjectStatus() external view returns (
        uint256 _fundsRaised,
        uint256 _fundingGoal,
        uint256 _currentStage,
        uint256 _totalStages,
        bool _fundingGoalReached,
        bool _projectCancelled,
        uint256 _timeRemaining
    ) {
        uint256 timeRemaining = 0;
        if (block.timestamp < fundingDeadline) {
            timeRemaining = fundingDeadline - block.timestamp;
        }
        
        return (
            fundsRaised,
            fundingGoal,
            currentStage,
            totalStages,
            fundingGoalReached,
            projectCancelled,
            timeRemaining
        );
    }
    
    /**
     * @dev Fallback function to receive ETH
     */
    receive() external payable {
        revert("Use donate() function to contribute");
    }
}
