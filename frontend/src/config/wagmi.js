import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, hardhat } from 'wagmi/chains'

const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://rpc.sepolia.org'

export const config = getDefaultConfig({
  appName: 'Milestone Funding Platform',
  projectId: 'milestone-funding-platform',
  chains: [sepolia, hardhat],
  ssr: false,
})
