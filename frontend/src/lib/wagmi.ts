import { http, createConfig } from 'wagmi';
import { sepolia, hardhat } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Get environment variables
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY || '';

// Configure chains
export const chains = [sepolia, hardhat] as const;

// Create wagmi config
export const config = createConfig({
  chains,
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [sepolia.id]: http(
      alchemyKey 
        ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}` 
        : 'https://rpc.sepolia.org'
    ),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
