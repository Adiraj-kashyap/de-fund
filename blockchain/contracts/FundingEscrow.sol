// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FundingEscrow
/// @notice Escrow contract that holds milestone-based crowdfunding deposits
///         and releases funds once the associated governance contract verifies
///         milestone completion.
contract FundingEscrow {
    /// @notice Emitted when the governance contract address is updated.
    event GovernanceUpdated(address indexed governance);

    /// @notice Emitted whenever a donation is received.
    event DonationReceived(address indexed donor, uint256 amount, uint256 totalRaised);

    /// @notice Emitted once the funding goal has been hit.
    event FundingGoalReached(uint256 totalRaised);

    /// @notice Emitted when milestone funds are released to the project owner.
    event StageFundsReleased(uint256 indexed stageIndex, uint256 amount);

    /// @notice Emitted when a donor successfully claims a refund.
    event RefundProcessed(address indexed donor, uint256 amountRefunded);

    /// @notice Emitted when the project has been marked as failed.
    event ProjectFailed();

    error ZeroAddress();
    error InvalidStageConfiguration();
    error AllocationMismatch();
    error FundingClosed();
    error GoalNotReached();
    error InvalidStage(uint256 stageIndex);
    error StageAlreadyReleased(uint256 stageIndex);
    error OnlyGovernance();
    error OnlyProjectOwner();
    error RefundUnavailable();
    error NoContribution();
    error TransferFailed();
    error ProjectFailedFlag();
    error ContributionTooLarge(uint256 remainingAllowed);
    error ReentrancyDetected();

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    address public immutable projectOwner;
    uint256 public immutable fundingGoal;
    uint256 public immutable deadline;

    address public governance;
    uint256 public totalStages;
    uint256 public fundsRaised;
    uint256 public totalReleased;
    uint256 public totalShares;
    bool public projectFailed;

    uint256 private _status;

    uint256[] private _stageAllocations;
    mapping(uint256 => bool) public stageReleased;
    mapping(address => uint256) private _shares;

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    modifier onlyProjectOwner() {
        if (msg.sender != projectOwner) revert OnlyProjectOwner();
        _;
    }

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrancyDetected();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    modifier fundingActive() {
        if (projectFailed) revert ProjectFailedFlag();
        if (block.timestamp >= deadline) revert FundingClosed();
        if (fundsRaised >= fundingGoal) revert FundingClosed();
        _;
    }

    constructor(
        address _projectOwner,
        uint256 _fundingGoal,
        uint256 _deadline,
        uint256[] memory stageAllocations,
        address _governance
    ) {
        if (_projectOwner == address(0) || _governance == address(0)) revert ZeroAddress();
        if (_fundingGoal == 0 || _deadline <= block.timestamp) revert InvalidStageConfiguration();
        if (stageAllocations.length == 0) revert InvalidStageConfiguration();

        uint256 total;
        for (uint256 i = 0; i < stageAllocations.length; ++i) {
            uint256 allocation = stageAllocations[i];
            if (allocation == 0) revert InvalidStageConfiguration();
            total += allocation;
        }
        if (total != _fundingGoal) revert AllocationMismatch();

        projectOwner = _projectOwner;
        fundingGoal = _fundingGoal;
        deadline = _deadline;
        governance = _governance;
        totalStages = stageAllocations.length;
        _stageAllocations = stageAllocations;
        _status = _NOT_ENTERED;

        emit GovernanceUpdated(_governance);
    }

    // -------------------- Donation Flow --------------------

    /// @notice Allows supporters to contribute funds while the campaign is active.
    function donate() external payable nonReentrant fundingActive {
        if (msg.value == 0) revert NoContribution();
        uint256 remaining = fundingGoal - fundsRaised;
        if (msg.value > remaining) revert ContributionTooLarge(remaining);

        fundsRaised += msg.value;
        totalShares += msg.value;
        _shares[msg.sender] += msg.value;

        emit DonationReceived(msg.sender, msg.value, fundsRaised);

        if (fundsRaised == fundingGoal) {
            emit FundingGoalReached(fundsRaised);
        }
    }

    /// @notice Returns the raw contribution (share units) associated with an address.
    function contributionOf(address account) external view returns (uint256) {
        return _shares[account];
    }

    /// @notice Computes the currently refundable amount for a contributor.
    function refundableAmount(address account) public view returns (uint256) {
        uint256 share = _shares[account];
        if (share == 0 || totalShares == 0) {
            return 0;
        }
        return (address(this).balance * share) / totalShares;
    }

    /// @notice Returns the allocation amount for a milestone stage.
    function getStageAllocation(uint256 stageIndex) external view returns (uint256) {
        if (stageIndex >= totalStages) revert InvalidStage(stageIndex);
        return _stageAllocations[stageIndex];
    }

    /// @notice Updates the governance contract empowered to release funds and mark failure.
    function setGovernance(address newGovernance) external onlyProjectOwner {
        if (newGovernance == address(0)) revert ZeroAddress();
        governance = newGovernance;
        emit GovernanceUpdated(newGovernance);
    }

    // -------------------- Governance Hooks --------------------

    /// @notice Releases the allocation for a specific milestone to the project owner.
    /// @dev Callable exclusively by the governance contract after a successful vote.
    function releaseFunds(uint256 stageIndex) external onlyGovernance nonReentrant {
        if (projectFailed) revert ProjectFailedFlag();
        if (fundsRaised < fundingGoal) revert GoalNotReached();
        if (stageIndex >= totalStages) revert InvalidStage(stageIndex);
        if (stageReleased[stageIndex]) revert StageAlreadyReleased(stageIndex);

        uint256 allocation = _stageAllocations[stageIndex];
        stageReleased[stageIndex] = true;
        totalReleased += allocation;

        (bool success, ) = projectOwner.call{value: allocation}("");
        if (!success) revert TransferFailed();

        emit StageFundsReleased(stageIndex, allocation);
    }

    /// @notice Marks the project as failed; enables contributor refunds.
    /// @dev Expected to be called by the governance contract when a dispute or
    ///      failed milestone decision requires returning remaining funds.
    function markProjectFailed() external onlyGovernance {
        if (projectFailed) revert ProjectFailedFlag();
        projectFailed = true;
        emit ProjectFailed();
    }

    // -------------------- Refund Logic --------------------

    /// @notice Allows donors to reclaim their remaining escrowed contribution.
    function refund() external nonReentrant {
        bool goalExpired = block.timestamp >= deadline && fundsRaised < fundingGoal;
        if (!(goalExpired || projectFailed)) revert RefundUnavailable();

        uint256 share = _shares[msg.sender];
        if (share == 0) revert NoContribution();
        uint256 payout = (address(this).balance * share) / totalShares;
        _shares[msg.sender] = 0;
        totalShares -= share;

        (bool success, ) = msg.sender.call{value: payout}("");
        if (!success) revert TransferFailed();

        emit RefundProcessed(msg.sender, payout);
    }

    /// @notice Returns the contract balance currently held in escrow.
    function escrowBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
