# ??? Command Reference Guide

Quick reference for all available commands in the project.

## ?? Installation & Setup

```bash
# Install all dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

## ?? Development Commands

### Compilation
```bash
# Compile contracts
npx hardhat compile

# Force recompile
npx hardhat compile --force

# Clean and compile
npx hardhat clean && npx hardhat compile
```

### Testing
```bash
# Run all tests
npm test

# Run tests with gas reporting
REPORT_GAS=true npm test

# Run specific test file
npx hardhat test test/FundingEscrow.test.js

# Run tests with coverage
npx hardhat coverage
```

### Local Development
```bash
# Start local Hardhat node (Terminal 1)
npx hardhat node

# Deploy to local network (Terminal 2)
npx hardhat run scripts/deploy.js --network localhost

# Interact with local contracts
npx hardhat run scripts/interact.js --network localhost <ESCROW_ADDR> <GOVERNANCE_ADDR>
```

## ?? Testnet Deployment (Sepolia)

### Deployment
```bash
# Deploy to Sepolia testnet
npm run deploy:sepolia

# Or manually
npx hardhat run scripts/deploy.js --network sepolia
```

### Verification
```bash
# Verify MilestoneGovernance
npx hardhat verify --network sepolia <GOVERNANCE_ADDRESS> "0x0000000000000000000000000000000000000000"

# Verify FundingEscrow (update values as needed)
npx hardhat verify --network sepolia <ESCROW_ADDRESS> \
  "<PROJECT_OWNER>" \
  "10000000000000000000" \
  "2592000" \
  "5" \
  "[2000,2000,2000,2000,2000]"
```

### Interaction
```bash
# Check contract status on Sepolia
npx hardhat run scripts/interact.js --network sepolia <ESCROW_ADDR> <GOVERNANCE_ADDR>
```

## ?? Hardhat Console

```bash
# Open Hardhat console (local)
npx hardhat console

# Open console on Sepolia
npx hardhat console --network sepolia
```

### Console Examples
```javascript
// Get signers
const [owner, addr1] = await ethers.getSigners();

// Get contract instance
const Escrow = await ethers.getContractFactory("FundingEscrow");
const escrow = await Escrow.attach("0x...");

// Read contract
const status = await escrow.getProjectStatus();
console.log(status);

// Write to contract
const tx = await escrow.donate({ value: ethers.parseEther("1.0") });
await tx.wait();
```

## ?? Analysis & Reporting

### Gas Reporter
```bash
# Enable gas reporting in tests
REPORT_GAS=true npx hardhat test
```

### Size Reporter
```bash
# Check contract sizes
npx hardhat size-contracts
```

### Coverage
```bash
# Generate coverage report
npx hardhat coverage

# View HTML report
open coverage/index.html
```

## ?? Cleanup

```bash
# Clean artifacts and cache
npx hardhat clean

# Remove node_modules
rm -rf node_modules package-lock.json

# Full clean and reinstall
rm -rf node_modules artifacts cache package-lock.json && npm install
```

## ?? Wallet & Account Commands

### Check Balance
```bash
# Using Hardhat
npx hardhat run scripts/check-balance.js --network sepolia

# Or in console
npx hardhat console --network sepolia
> const balance = await ethers.provider.getBalance("0xYourAddress");
> console.log(ethers.formatEther(balance));
```

## ?? Contract Interaction Snippets

### Donate to Project
```javascript
// In Hardhat console
const escrow = await ethers.getContractAt("FundingEscrow", "0x...");
const tx = await escrow.donate({ value: ethers.parseEther("1.0") });
await tx.wait();
console.log("Donated 1 ETH");
```

### Register as Voter
```javascript
const governance = await ethers.getContractAt("MilestoneGovernance", "0x...");
const tx = await governance.registerVoter({ value: ethers.parseEther("0.1") });
await tx.wait();
console.log("Registered as voter with 0.1 ETH stake");
```

### Create Milestone Proposal
```javascript
const governance = await ethers.getContractAt("MilestoneGovernance", "0x...");
const tx = await governance.createMilestoneProposal(
  "0xEscrowAddress",
  0,
  "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
);
await tx.wait();
console.log("Proposal created");
```

### Vote on Proposal
```javascript
const governance = await ethers.getContractAt("MilestoneGovernance", "0x...");
const tx = await governance.vote(0, true); // true = approve
await tx.wait();
console.log("Voted on proposal");
```

### Execute Proposal
```javascript
const governance = await ethers.getContractAt("MilestoneGovernance", "0x...");
const tx = await governance.executeProposal(0);
await tx.wait();
console.log("Proposal executed");
```

## ?? Git Commands (Project Management)

```bash
# Check status
git status

# View changes
git diff

# Stage changes
git add .

# Commit
git commit -m "Your message"

# Push to remote
git push origin <branch-name>

# View commit history
git log --oneline

# Create new branch
git checkout -b feature/new-feature
```

## ?? Documentation Generation

```bash
# Generate documentation (if docgen is installed)
npx hardhat docgen

# View generated docs
open docs/index.html
```

## ?? Debugging

### Verbose Output
```bash
# Run with verbose logging
npx hardhat test --verbose

# Show stack traces
npx hardhat test --show-stack-traces
```

### Debug Specific Transaction
```bash
# In Hardhat console
const tx = await contract.someFunction();
const receipt = await tx.wait();
console.log(receipt);
```

## ?? Useful Etherscan Commands

```bash
# View contract on Sepolia Etherscan
open https://sepolia.etherscan.io/address/<CONTRACT_ADDRESS>

# View transaction
open https://sepolia.etherscan.io/tx/<TX_HASH>
```

## ?? Quick Start Summary

```bash
# 1. Setup
npm install
cp .env.example .env

# 2. Test
npm test

# 3. Deploy locally
npx hardhat node                                    # Terminal 1
npx hardhat run scripts/deploy.js --network localhost # Terminal 2

# 4. Deploy to Sepolia
npm run deploy:sepolia
```

## ?? Environment Variables Reference

Required in `.env`:
```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_wallet_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
REPORT_GAS=false
```

## ?? Troubleshooting

### Problem: Compilation fails
```bash
npx hardhat clean
rm -rf node_modules artifacts cache
npm install
npx hardhat compile
```

### Problem: Tests fail with "insufficient funds"
- Ensure your local Hardhat node is running
- Check you're using correct network in hardhat.config.js
- Verify account has test ETH

### Problem: Deployment fails on Sepolia
- Check `.env` has correct SEPOLIA_RPC_URL
- Verify PRIVATE_KEY is valid
- Ensure account has Sepolia ETH (get from faucet)
- Check network configuration in hardhat.config.js

### Problem: Contract verification fails
- Ensure ETHERSCAN_API_KEY is set
- Wait a few seconds after deployment before verifying
- Double-check constructor arguments match deployment

## ?? Getting Help

```bash
# Hardhat help
npx hardhat help

# Help for specific task
npx hardhat help compile
npx hardhat help test

# List all available tasks
npx hardhat
```

---

**Pro Tip:** Add these to your `.bashrc` or `.zshrc` for shortcuts:
```bash
alias hh="npx hardhat"
alias hhc="npx hardhat compile"
alias hht="npx hardhat test"
alias hhn="npx hardhat node"
```
