# Milestone Funding Platform - Frontend

React frontend for the milestone-based decentralized funding platform.

## Features

- ?? Wallet connection with RainbowKit
- ?? Project listing and details
- ?? Donation interface
- ??? DAO voting on milestones
- ?? Project creation (with backend integration)
- ?? Responsive design with Tailwind CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your contract addresses and API URL

4. Start development server:
```bash
npm run dev
```

## Environment Variables

- `VITE_RPC_URL` - Ethereum RPC endpoint
- `VITE_CONTRACT_ADDRESSES` - JSON object with contract addresses
- `VITE_API_URL` - Backend API URL
- `VITE_IPFS_GATEWAY` - IPFS gateway URL

## Tech Stack

- React 18
- Vite
- Wagmi v2
- RainbowKit
- Tailwind CSS
- React Router
- Axios
