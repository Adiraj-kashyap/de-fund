# Milestone-Based Decentralized Funding Platform

Smart-contract driven crowdfunding that releases project funds only after on-chain governance approves milestone completion. This repository contains the Solidity contracts, tests, and deployment utilities that make up the trust-minimized funding core.

## Project Structure

- `contracts/` ? Solidity sources (`FundingEscrow`, `MilestoneGovernance`).
- `test/` ? Hardhat test suite covering donation, refund, and governance flows.
- `scripts/deploy.ts` ? Configurable deployment helper for both contracts.
- `hardhat.config.ts` ? Hardhat configuration (Solidity 0.8.24, Sepolia network wiring).

## Prerequisites

- Node.js 18+
- npm 8+
- (Optional) Access to an Ethereum JSON-RPC endpoint (Sepolia recommended).

## Setup

```bash
npm install
```

Create a `.env` file (or export variables) with network credentials when deploying:

```bash
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/<project-id>"
export DEPLOYER_PRIVATE_KEY="0xabc123..."
```

## Testing

Run the full Hardhat suite:

```bash
npx hardhat test
```

The tests cover:

- Funding goal enforcement and donation tracking.
- Refund activation on missed deadlines or project cancellation.
- Proposal creation, voting quorum checks, and milestone fund releases.

## Deployment

Use the provided script to deploy and link both contracts in one step:

```bash
FUNDING_GOAL_ETH=9 \
TOTAL_STAGES=3 \
STAGE_ALLOCATIONS="3,3,3" \
FUNDING_DEADLINE_DAYS=45 \
VOTING_PERIOD_SECONDS=259200 \
QUORUM_BPS=6000 \
npx hardhat run scripts/deploy.ts --network sepolia
```

Environment variables:

- `FUNDING_GOAL_ETH` ? Total raise target in ETH (default `3`).
- `TOTAL_STAGES` ? Number of milestones (supports 3, 5, or 7 for now).
- `STAGE_ALLOCATIONS` ? Optional comma-separated ETH allocations per stage (must sum to the goal).
- `FUNDING_DEADLINE_DAYS` ? Donation window length (default `30`).
- `VOTING_PERIOD_SECONDS` ? How long proposals stay open (default `259200` = 3 days).
- `QUORUM_BPS` ? Minimum turnout in basis points (default `5000` = 50%).

The script logs deployed addresses and links `FundingEscrow` to `MilestoneGovernance` automatically.

## Next Steps

- Integrate a front-end (React + wagmi) for fundraiser and donor dashboards.
- Index contract events with The Graph or a custom listener for performant APIs.
- Persist milestone evidence on IPFS/Filecoin; store hashes via proposals.
- Extend governance with staking/reputation modules and arbitration hooks (e.g., Kleros).

## Troubleshooting

- **Compilation errors**: ensure Node.js and npm versions meet prerequisites; run `npx hardhat clean` then recompile.
- **Deployment failures**: confirm RPC URL/private key environment variables and funding of the deployer account.
- **Voting tests failing**: reset local chain (`npx hardhat test --network hardhat`) to clear cached state.

Feel free to fork and iterate on milestone logic, add ERC-20 support, or integrate additional DAO mechanics.
