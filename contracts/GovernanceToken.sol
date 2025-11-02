// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GovernanceToken
 * @dev ERC20 token used for governance voting in the milestone funding platform
 * Tokens are distributed to project donors and can be staked for voting rights
 */
contract GovernanceToken is ERC20, Ownable {
    // Mapping to track authorized minters (typically the escrow contract)
    mapping(address => bool) public authorizedMinters;
    
    // Events
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    
    /**
     * @dev Constructor creates the governance token
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _initialSupply Initial supply (can be 0 if minting dynamically)
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        if (_initialSupply > 0) {
            _mint(msg.sender, _initialSupply);
        }
    }
    
    /**
     * @dev Adds an authorized minter (e.g., escrow contract)
     * @param _minter Address to authorize for minting
     */
    function addMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Minter cannot be zero address");
        authorizedMinters[_minter] = true;
        emit MinterAdded(_minter);
    }
    
    /**
     * @dev Removes an authorized minter
     * @param _minter Address to remove from authorized minters
     */
    function removeMinter(address _minter) external onlyOwner {
        authorizedMinters[_minter] = false;
        emit MinterRemoved(_minter);
    }
    
    /**
     * @dev Mints tokens to a recipient
     * Only callable by authorized minters
     * @param _to Address to mint tokens to
     * @param _amount Amount of tokens to mint
     */
    function mint(address _to, uint256 _amount) external {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        require(_to != address(0), "Cannot mint to zero address");
        _mint(_to, _amount);
    }
    
    /**
     * @dev Mints tokens to multiple recipients (for batch airdrops)
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of amounts to mint (must match recipients length)
     */
    function batchMint(address[] memory _recipients, uint256[] memory _amounts) external {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        require(_recipients.length == _amounts.length, "Array length mismatch");
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Cannot mint to zero address");
            _mint(_recipients[i], _amounts[i]);
        }
    }
}
