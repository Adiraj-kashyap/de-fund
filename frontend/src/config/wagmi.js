import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, hardhat } from 'wagmi/chains'
import { http } from 'wagmi'

const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://rpc.sepolia.org'

// Note: You need a WalletConnect Cloud projectId (get free one at https://cloud.walletconnect.com)
// For now using a placeholder - replace with your actual projectId
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'your-project-id-here'

export const config = getDefaultConfig({
  appName: 'Milestone Funding Platform',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [sepolia, hardhat],
  transports: {
    [sepolia.id]: http(RPC_URL),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
  ssr: false,
})
