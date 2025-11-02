# MilestoneFund Frontend

Modern React frontend for the milestone-based decentralized funding platform.

## ?? Quick Start

### Prerequisites
- Node.js 18+ and npm
- MetaMask or another Web3 wallet

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your contract addresses
# VITE_ESCROW_ADDRESS=0x...
# VITE_GOVERNANCE_ADDRESS=0x...
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:5173
```

### Build for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

## ?? Project Structure

```
frontend/
??? src/
?   ??? components/        # Reusable UI components
?   ?   ??? Layout.tsx
?   ?   ??? WalletConnect.tsx
?   ?   ??? ProjectCard.tsx
?   ?   ??? ...
?   ??? pages/            # Page components
?   ?   ??? Home.tsx
?   ?   ??? Projects.tsx
?   ?   ??? ProjectDetail.tsx
?   ?   ??? Governance.tsx
?   ?   ??? Profile.tsx
?   ??? hooks/            # Custom React hooks
?   ?   ??? useEscrow.ts
?   ?   ??? useGovernance.ts
?   ??? contracts/        # Contract ABIs and addresses
?   ?   ??? abis/
?   ?   ??? addresses.ts
?   ??? lib/              # Utilities and configuration
?   ?   ??? wagmi.ts
?   ?   ??? utils.ts
?   ?   ??? ipfs.ts
?   ??? App.tsx           # Main app component
?   ??? main.tsx          # Entry point
??? index.html
??? package.json
??? vite.config.ts
```

## ?? Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```bash
# Contract addresses (required)
VITE_ESCROW_ADDRESS=0x...
VITE_GOVERNANCE_ADDRESS=0x...

# Network configuration
VITE_CHAIN_ID=1337  # Local development (1337), use 11155111 for Sepolia testnet

# Optional: Alchemy API key for better RPC
VITE_ALCHEMY_API_KEY=your_alchemy_key

# Optional: WalletConnect project ID
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# Optional: IPFS configuration
VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/
VITE_PINATA_API_KEY=your_pinata_key
VITE_PINATA_SECRET_KEY=your_pinata_secret
```

### Getting API Keys

1. **Alchemy**: Sign up at [alchemy.com](https://www.alchemy.com/) for better RPC reliability
2. **WalletConnect**: Get Project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com/)
3. **Pinata**: Sign up at [pinata.cloud](https://www.pinata.cloud/) for IPFS uploads

## ?? Features

### Implemented
- ? Wallet connection (MetaMask, WalletConnect)
- ? Project browsing and details
- ? Donation functionality with real-time updates
- ? DAO governance voting interface
- ? Voter registration and staking
- ? User profile with stats
- ? Milestone timeline visualization
- ? Responsive design
- ? Toast notifications
- ? Loading states and error handling

### Pages

1. **Home** - Landing page with features and how it works
2. **Projects** - Browse all funding projects
3. **Project Detail** - View project details and donate
4. **Governance** - Vote on milestone proposals
5. **Profile** - View your contributions and voting stats

## ?? Web3 Integration

### Wagmi Hooks Used

```typescript
// Account management
useAccount()
useConnect()
useDisconnect()

// Reading contract data
useReadContract()

// Writing to contracts
useWriteContract()
useWaitForTransactionReceipt()
```

### Custom Hooks

```typescript
// Escrow contract
useEscrowStatus()        // Get project status
useDonate()             // Make a donation
useRefund()             // Request refund
useUserContribution()   // Get user's contribution

// Governance contract
useVoterInfo()          // Get voter information
useRegisterVoter()      // Register as voter
useVote()               // Vote on proposal
useExecuteProposal()    // Execute proposal result
```

## ?? Usage Examples

### Connecting a Wallet

The `WalletConnect` component handles wallet connection:

```tsx
import { WalletConnect } from './components/WalletConnect';

<WalletConnect />
```

### Making a Donation

```tsx
import { useDonate } from './hooks/useEscrow';

const { donate, isPending } = useDonate();

const handleDonate = () => {
  donate(parseEther("1.0")); // Donate 1 ETH
};
```

### Voting on a Proposal

```tsx
import { useVote } from './hooks/useGovernance';

const { vote, isPending } = useVote();

const handleVote = (proposalId: number, approve: boolean) => {
  vote(proposalId, approve);
};
```

## ?? Styling

Built with **Tailwind CSS** for responsive, modern UI:

- Custom color palette (primary, success, warning, danger)
- Reusable component classes (btn, card, input, badge)
- Responsive grid layouts
- Dark/light mode ready
- Custom animations

### Custom Components

```tsx
<ProgressBar current={50} total={100} />
<ProjectCard {...projectData} />
<MilestoneTimeline milestones={[...]} />
```

## ?? Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Mobile navigation menu
- Touch-friendly interactions

## ?? Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or use Vercel dashboard
# https://vercel.com/
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### IPFS (Decentralized Hosting)

```bash
# Build first
npm run build

# Upload dist/ folder to:
# - Fleek: https://fleek.co/
# - IPFS Desktop: https://docs.ipfs.tech/install/ipfs-desktop/
```

### Environment Variables in Production

Remember to set your environment variables in your hosting platform:
- Vercel: Settings ? Environment Variables
- Netlify: Site settings ? Build & deploy ? Environment

## ?? Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` only
2. **Validate user input** - Always sanitize before sending to contracts
3. **Handle errors gracefully** - Show user-friendly messages
4. **Test on testnet first** - Use Sepolia before mainnet
5. **Check contract addresses** - Verify before deployment

## ?? Troubleshooting

### Wallet Won't Connect
- Check if MetaMask is installed
- Ensure you're on the correct network (Sepolia)
- Try refreshing the page

### Transactions Failing
- Check if contract addresses are correct in `.env`
- Ensure you have enough ETH for gas
- Verify the contract is deployed on the network

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
```

## ?? Technologies Used

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Wagmi** - Web3 React hooks
- **Viem** - Ethereum library
- **TanStack Query** - Data fetching
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Lucide Icons** - Icon library
- **React Hot Toast** - Notifications

## ?? Useful Links

- [Wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)

## ?? License

MIT License - see LICENSE file for details

---

**Built with ?? for transparent crowdfunding**
