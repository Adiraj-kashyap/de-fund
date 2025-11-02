// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FundingEscrow.sol";
import "./MilestoneGovernance.sol";
import "./GovernanceToken.sol";

/**
 * @title ProjectFactory
 * @dev Factory contract for creating new funding projects
 * Simplifies project creation by deploying all necessary contracts
 */
contract ProjectFactory {
    // Token and governance configuration
    address public immutable governanceToken;
    uint256 public immutable votingPeriod;
    uint256 public immutable minimumStake;
    
    // Deployed projects tracking
    address[] public deployedProjects;
    mapping(address => address) public projectToGovernance; // escrow => governance
    mapping(address => address) public projectToOwner; // escrow => owner
    
    // Events
    event ProjectCreated(
        address indexed projectOwner,
        address indexed escrowContract,
        address indexed governanceContract,
        uint256 fundingGoal,
        uint256 deadline,
        uint256 totalStages
    );
    
    /**
     * @dev Constructor sets up factory with governance parameters
     * @param _governanceToken Address of the governance token (deploy separately)
     * @param _votingPeriod Voting period in seconds
     * @param _minimumStake Minimum tokens required to vote
     */
    constructor(
        address _governanceToken,
        uint256 _votingPeriod,
        uint256 _minimumStake
    ) {
        require(_governanceToken != address(0), "Governance token cannot be zero address");
        require(_votingPeriod > 0, "Voting period must be greater than zero");
        
        governanceToken = _governanceToken;
        votingPeriod = _votingPeriod;
        minimumStake = _minimumStake;
    }
    
    /**
     * @dev Creates a new funding project with escrow and governance contracts
     * @param _fundingGoal Total funding goal in wei
     * @param _deadline Unix timestamp when funding period ends
     * @param _totalStages Number of milestones/stages
     * @param _fundsAllocatedPerStage Array of fund allocations per stage
     * @return escrowAddress Address of the deployed FundingEscrow contract
     * @return governanceAddress Address of the deployed MilestoneGovernance contract
     */
    function createProject(
        uint256 _fundingGoal,
        uint256 _deadline,
        uint256 _totalStages,
        uint256[] memory _fundsAllocatedPerStage
    ) external returns (address escrowAddress, address governanceAddress) {
        // Deploy FundingEscrow
        FundingEscrow escrow = new FundingEscrow(
            msg.sender, // project owner
            _fundingGoal,
            _deadline,
            _totalStages,
            _fundsAllocatedPerStage
        );
        escrowAddress = address(escrow);
        
        // Deploy MilestoneGovernance
        MilestoneGovernance governance = new MilestoneGovernance(
            governanceToken,
            votingPeriod,
            minimumStake
        );
        governanceAddress = address(governance);
        
        // Link contracts
        escrow.setGovernanceContract(governanceAddress);
        governance.setEscrowContract(escrowAddress);
        
        // Track project
        deployedProjects.push(escrowAddress);
        projectToGovernance[escrowAddress] = governanceAddress;
        projectToOwner[escrowAddress] = msg.sender;
        
        emit ProjectCreated(
            msg.sender,
            escrowAddress,
            governanceAddress,
            _fundingGoal,
            _deadline,
            _totalStages
        );
        
        return (escrowAddress, governanceAddress);
    }
    
    /**
     * @dev Returns the number of deployed projects
     */
    function getProjectCount() external view returns (uint256) {
        return deployedProjects.length;
    }
    
    /**
     * @dev Returns all deployed project addresses
     */
    function getAllProjects() external view returns (address[] memory) {
        return deployedProjects;
    }
    
    /**
     * @dev Returns projects created by a specific owner
     * @param _owner Address of the project owner
     * @return projects Array of escrow contract addresses
     */
    function getProjectsByOwner(address _owner) external view returns (address[] memory) {
        uint256 count = 0;
        
        // Count projects by owner
        for (uint256 i = 0; i < deployedProjects.length; i++) {
            if (projectToOwner[deployedProjects[i]] == _owner) {
                count++;
            }
        }
        
        // Build result array
        address[] memory projects = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < deployedProjects.length; i++) {
            if (projectToOwner[deployedProjects[i]] == _owner) {
                projects[index] = deployedProjects[i];
                index++;
            }
        }
        
        return projects;
    }
}
