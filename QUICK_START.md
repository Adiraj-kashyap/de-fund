# Quick Start Guide

Get the Milestone Funding Platform running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- MetaMask or similar wallet
- Free WalletConnect Cloud account (https://cloud.walletconnect.com)

## Step 1: Install Dependencies (2 minutes)

```bash
# Run the setup script
./setup.sh

# Or manually:
npm install
cd backend && npm install
cd ../frontend && npm install
```

## Step 2: Configure Environment (1 minute)

### Root `.env` (for smart contracts)
```env
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=your_private_key_here
```

### Backend `backend/.env`
```env
PORT=5000
RPC_URL=https://rpc.sepolia.org
DATABASE_PATH=./data/database.db
CONTRACT_ADDRESSES={"FundingEscrow":"","MilestoneGovernance":"","GovernanceToken":""}
CORS_ORIGIN=http://localhost:3000
```

### Frontend `frontend/.env`
```env
VITE_RPC_URL=https://rpc.sepolia.org
VITE_CONTRACT_ADDRESSES={"FundingEscrow":"","MilestoneGovernance":"","GovernanceToken":""}
VITE_API_URL=http://localhost:5000
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

**Get WalletConnect Project ID:**
1. Go to https://cloud.walletconnect.com
2. Sign up (free)
3. Create new project
4. Copy Project ID

## Step 3: Deploy Contracts (1 minute)

```bash
# Deploy to Sepolia testnet
npm run deploy:sepolia
```

**Save the contract addresses** to:
- `backend/.env` ? `CONTRACT_ADDRESSES`
- `frontend/.env` ? `VITE_CONTRACT_ADDRESSES`

## Step 4: Start Services (1 minute)

Open **3 terminal windows**:

### Terminal 1: Backend API
```bash
cd backend
npm start
```

### Terminal 2: Blockchain Indexer
```bash
cd backend
npm run index
```

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

## Step 5: Test It! ??

1. Open http://localhost:3000
2. Connect your wallet (MetaMask)
3. Create a test project
4. Donate to a project
5. Create a milestone proposal
6. Vote on proposals

## Troubleshooting

### "Cannot connect to wallet"
- Make sure MetaMask is installed
- Check WalletConnect Project ID is correct
- Try refreshing the page

### "Contract not found"
- Verify contract addresses in `.env` files
- Make sure contracts are deployed
- Check RPC URL is correct

### "Backend not responding"
- Check backend is running on port 5000
- Verify CORS_ORIGIN matches frontend URL
- Check backend logs for errors

### "IPFS not working"
- IPFS is optional - app works without it
- To enable: Install IPFS node (`ipfs daemon`)
- Or use public gateway (works but slower)

## Next Steps

- Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production setup
- Check [README.md](./README.md) for full documentation
- Review [CONTRACT_OVERVIEW.md](./CONTRACT_OVERVIEW.md) for smart contract details

## Need Help?

- Check the README files in each directory
- Review test files for usage examples
- Check browser console and backend logs

Happy funding! ??
