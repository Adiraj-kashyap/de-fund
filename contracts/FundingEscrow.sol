// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FundingEscrow
/// @notice Holds project funds until milestones are approved by governance.
/// Funds are released sequentially per milestone once the governance contract
/// signals approval. Contributors can reclaim their proportional share of the
/// remaining escrowed funds if the funding goal is missed or the project is
/// cancelled before all milestones are paid out.
contract FundingEscrow is ReentrancyGuard {
    /// @notice Raised when attempting to interact with the escrow after refunds have been enabled.
    error RefundsActive();

    /// @notice Raised when an invalid milestone index is provided.
    error InvalidStage(uint256 stageIndex);

    /// @notice Raised when caller is not the configured governance contract.
    error NotGovernance();

    /// @notice Raised when caller is not the project owner.
    error NotProjectOwner();

    /// @notice Raised when attempting to interact with an inactive project.
    error ProjectInactive();

    /// @notice Raised when the governance address configuration is invalid.
    error InvalidGovernance();

    /// @notice Raised when the provided milestone configuration is invalid.
    error InvalidMilestoneConfiguration();

    /// @notice Raised when donations would push the escrow beyond the funding goal.
    error GoalExceeded();

    event FundsDonated(address indexed donor, uint256 amount, uint256 totalRaised);
    event GovernanceUpdated(address indexed governance);
    event MilestoneFundsReleased(uint256 indexed stageIndex, uint256 amount, address indexed recipient);
    event FundingGoalReached(uint256 totalRaised);
    event RefundsEnabled(uint256 refundPool);
    event RefundClaimed(address indexed donor, uint256 amount);
    event ProjectCancelled(address indexed triggeredBy);

    address public immutable projectOwner;
    uint256 public immutable fundingGoal;
    uint256 public immutable deadline;
    uint8 public immutable totalStages;

    uint256 public fundsRaised;
    uint256 public totalReleased;
    uint8 public currentStage;

    address public governance;
    bool public cancelled;
    bool public refundsEnabled;

    uint256 private refundPoolSnapshot;
    uint256 private totalContributionSnapshot;

    uint256[] private stageAllocations;
    bool[] private stageReleased;

    mapping(address => uint256) public contributions;
    mapping(address => uint256) public refunded;

    modifier onlyProjectOwner() {
        if (msg.sender != projectOwner) revert NotProjectOwner();
        _;
    }

    modifier onlyGovernance() {
        if (msg.sender != governance) revert NotGovernance();
        _;
    }

    constructor(
        address _projectOwner,
        uint256 _fundingGoal,
        uint256 _deadline,
        uint8 _totalStages,
        uint256[] memory _stageAllocations
    ) {
        if (_projectOwner == address(0)) revert NotProjectOwner();
        if (_fundingGoal == 0 || _deadline <= block.timestamp) revert InvalidMilestoneConfiguration();
        if (_totalStages == 0 || _totalStages != _stageAllocations.length) revert InvalidMilestoneConfiguration();
        if (_totalStages != 3 && _totalStages != 5 && _totalStages != 7) revert InvalidMilestoneConfiguration();

        uint256 total;
        for (uint256 i = 0; i < _stageAllocations.length; i++) {
            uint256 allocation = _stageAllocations[i];
            if (allocation == 0) revert InvalidMilestoneConfiguration();
            total += allocation;
        }
        if (total != _fundingGoal) revert InvalidMilestoneConfiguration();

        projectOwner = _projectOwner;
        fundingGoal = _fundingGoal;
        deadline = _deadline;
        totalStages = _totalStages;

        stageAllocations = _stageAllocations;
        stageReleased = new bool[](_totalStages);
    }

    receive() external payable {
        donate();
    }

    /// @notice Allows contributors to donate funds towards the project goal.
    function donate() public payable nonReentrant {
        if (refundsEnabled) revert RefundsActive();
        if (cancelled) revert ProjectInactive();
        if (block.timestamp > deadline) revert("Funding period ended");
        if (msg.value == 0) revert("Zero value");

        uint256 newTotal = fundsRaised + msg.value;
        if (newTotal > fundingGoal) revert GoalExceeded();

        contributions[msg.sender] += msg.value;
        fundsRaised = newTotal;

        emit FundsDonated(msg.sender, msg.value, fundsRaised);

        if (fundsRaised == fundingGoal) {
            emit FundingGoalReached(fundsRaised);
        }
    }

    /// @notice Sets the governance contract that can approve milestone releases.
    /// @dev Can only be set once by the project owner.
    function setGovernance(address _governance) external onlyProjectOwner {
        if (governance != address(0) || _governance == address(0)) revert InvalidGovernance();
        governance = _governance;
        emit GovernanceUpdated(_governance);
    }

    /// @notice Releases the funds allocated for a milestone directly to the project owner.
    /// @param stageIndex Index of the milestone to release (0-based).
    function releaseFunds(uint256 stageIndex) external onlyGovernance nonReentrant {
        if (refundsEnabled) revert RefundsActive();
        if (stageIndex >= totalStages) revert InvalidStage(stageIndex);
        if (stageIndex != currentStage) revert("Stage out of order");
        if (stageReleased[stageIndex]) revert("Stage already released");
        if (fundsRaised < fundingGoal) revert("Funding goal not reached");

        uint256 amount = stageAllocations[stageIndex];
        stageReleased[stageIndex] = true;
        currentStage += 1;
        totalReleased += amount;

        (bool success, ) = projectOwner.call{value: amount}("");
        require(success, "Transfer failed");

        emit MilestoneFundsReleased(stageIndex, amount, projectOwner);
    }

    /// @notice Cancels the project, enabling refunds for contributors over remaining funds.
    /// @dev Only callable by the governance contract following an off-chain decision process.
    function cancelProject() external onlyGovernance {
        if (cancelled) revert("Already cancelled");
        cancelled = true;
        emit ProjectCancelled(msg.sender);
        _enableRefunds();
    }

    /// @notice Claims the caller's refundable portion if refunds are enabled.
    function refund() external nonReentrant {
        if (!refundsEnabled) {
            bool canRefund = (block.timestamp > deadline && fundsRaised < fundingGoal) || cancelled;
            require(canRefund, "Refunds not available");
            _enableRefunds();
        }

        uint256 contributorShare = contributions[msg.sender];
        require(contributorShare > 0, "No contributions");

        uint256 totalEntitled = (contributorShare * refundPoolSnapshot) / totalContributionSnapshot;
        uint256 alreadyRefunded = refunded[msg.sender];
        uint256 payout = totalEntitled - alreadyRefunded;
        require(payout > 0, "Nothing to refund");

        refunded[msg.sender] = totalEntitled;

        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Refund failed");

        emit RefundClaimed(msg.sender, payout);
    }

    /// @notice Returns the allocation amount for a given stage.
    function getStageAllocation(uint256 stageIndex) external view returns (uint256) {
        if (stageIndex >= totalStages) revert InvalidStage(stageIndex);
        return stageAllocations[stageIndex];
    }

    /// @notice Returns whether a given stage has already been released.
    function isStageReleased(uint256 stageIndex) external view returns (bool) {
        if (stageIndex >= totalStages) revert InvalidStage(stageIndex);
        return stageReleased[stageIndex];
    }

    function _enableRefunds() internal {
        if (refundsEnabled) return;
        if (totalContributionSnapshot == 0) {
            totalContributionSnapshot = fundsRaised;
        }
        refundPoolSnapshot = address(this).balance;
        refundsEnabled = true;
        emit RefundsEnabled(refundPoolSnapshot);
    }
}
