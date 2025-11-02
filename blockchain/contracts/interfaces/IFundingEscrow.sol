// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFundingEscrow {
    function projectOwner() external view returns (address);

    function totalStages() external view returns (uint256);

    function stageReleased(uint256 stageIndex) external view returns (bool);

    function releaseFunds(uint256 stageIndex) external;

    function markProjectFailed() external;
}
