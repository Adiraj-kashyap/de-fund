# Deployment Guide

Complete guide for deploying the Milestone Funding Platform to production.

## Prerequisites

- Node.js 18+
- MetaMask or similar wallet
- Sepolia ETH for testnet deployment
- WalletConnect Cloud account (free) for frontend
- IPFS node (optional, can use public gateway)

## Step 1: Deploy Smart Contracts

### 1.1 Configure Environment

Create `.env` file in root directory:

```env
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=your_deployer_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_for_verification
```

### 1.2 Deploy Contracts

**Option A: Deploy Factory (Recommended)**

```bash
# Deploy ProjectFactory (deploys GovernanceToken automatically)
GOVERNANCE_TOKEN_ADDRESS="" node scripts/deploy-factory.js --network sepolia
```

This creates a factory that makes project creation easier. Save the factory address.

**Option B: Deploy Individual Contracts**

```bash
# Deploy all contracts individually
npm run deploy:sepolia
```

### 1.3 Save Contract Addresses

After deployment, save the addresses:

```json
{
  "FundingEscrow": "0x...",
  "MilestoneGovernance": "0x...",
  "GovernanceToken": "0x...",
  "ProjectFactory": "0x..." // if using factory
}
```

## Step 2: Set Up Backend

### 2.1 Install Dependencies

```bash
cd backend
npm install
```

### 2.2 Configure Environment

Create `backend/.env`:

```env
PORT=5000
RPC_URL=https://rpc.sepolia.org
DATABASE_PATH=./data/database.db
CONTRACT_ADDRESSES={"FundingEscrow":"0x...","MilestoneGovernance":"0x...","GovernanceToken":"0x..."}
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY=https://ipfs.io/ipfs/
CORS_ORIGIN=http://localhost:3000
```

**Note:** For production, use:
- PostgreSQL instead of SQLite
- Environment-specific RPC URLs
- Secure CORS origins
- IPFS node or pinning service (Pinata, Infura, etc.)

### 2.3 Start Backend

```bash
npm start
```

### 2.4 Run Indexer

In a separate terminal or as a background service:

```bash
npm run index
```

For production, set up a cron job or use PM2:

```bash
pm2 start scripts/indexer.js --name indexer --cron "*/5 * * * *"
```

## Step 3: Set Up Frontend

### 3.1 Install Dependencies

```bash
cd frontend
npm install
```

### 3.2 Get WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Create a free account
3. Create a new project
4. Copy the Project ID

### 3.3 Configure Environment

Create `frontend/.env`:

```env
VITE_RPC_URL=https://rpc.sepolia.org
VITE_CONTRACT_ADDRESSES={"FundingEscrow":"0x...","MilestoneGovernance":"0x...","GovernanceToken":"0x..."}
VITE_API_URL=http://localhost:5000
VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### 3.4 Build Frontend

```bash
npm run build
```

The `dist/` folder contains the production build.

### 3.5 Deploy Frontend

**Option A: Vercel (Recommended)**

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Add environment variables in Vercel dashboard

**Option B: Netlify**

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod`
3. Add environment variables in Netlify dashboard

**Option C: Static Hosting**

Upload `dist/` folder to any static hosting:
- AWS S3 + CloudFront
- GitHub Pages
- Cloudflare Pages
- Any web server

## Step 4: Production Considerations

### 4.1 Database

For production, migrate from SQLite to PostgreSQL:

```bash
# Install PostgreSQL adapter
npm install pg

# Update database.js to use PostgreSQL
# Use connection pooling
# Add migrations system (e.g., Knex.js)
```

### 4.2 IPFS

**Option A: Self-hosted IPFS Node**

```bash
# Install IPFS
ipfs init
ipfs daemon
```

Update `IPFS_API_URL` to `http://your-server:5001`

**Option B: Pinata (Recommended for production)**

1. Sign up at https://pinata.cloud
2. Get API key
3. Update backend to use Pinata API

**Option C: Public Gateway (Development only)**

Works but not recommended for production.

### 4.3 Security

- Use HTTPS everywhere
- Set proper CORS origins
- Validate all inputs
- Rate limit API endpoints
- Use environment variables for secrets
- Enable API authentication if needed

### 4.4 Monitoring

- Set up error tracking (Sentry, Rollbar)
- Monitor contract events
- Track API performance
- Set up alerts for failures

### 4.5 Gas Optimization

- Consider using meta-transactions for voting
- Batch operations where possible
- Use proxy patterns for upgradability

## Step 5: Mainnet Deployment

When ready for mainnet:

1. **Audit Smart Contracts**
   - Get professional security audit
   - Review all contract code
   - Test extensively on testnets

2. **Update Configuration**
   - Change RPC URLs to mainnet
   - Update contract addresses
   - Use mainnet ETH

3. **Deploy**
   ```bash
   npm run deploy:mainnet
   ```

4. **Verify Contracts**
   ```bash
   npx hardhat verify --network mainnet CONTRACT_ADDRESS
   ```

5. **Monitor**
   - Watch for issues
   - Monitor gas costs
   - Track usage metrics

## Troubleshooting

### Contracts Not Deploying

- Check RPC URL is correct
- Ensure wallet has enough ETH
- Verify private key is correct

### Frontend Can't Connect

- Check RPC URL
- Verify WalletConnect Project ID
- Check contract addresses are correct
- Check browser console for errors

### Backend Not Indexing

- Verify RPC URL is accessible
- Check contract addresses
- Review indexer logs
- Ensure database is writable

### IPFS Not Working

- Verify IPFS node is running
- Check IPFS_API_URL is correct
- Test IPFS node: `curl http://localhost:5001/api/v0/version`
- Use public gateway as fallback

## Support

For issues or questions:
- Check documentation in `/README.md`
- Review contract overview in `/CONTRACT_OVERVIEW.md`
- Check test files for usage examples
