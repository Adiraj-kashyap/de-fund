import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import type { Chain } from 'viem';
import { injected, walletConnect } from 'wagmi/connectors';

// Get environment variables
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY || '';

// Define localhost chain with chain ID 1337
const localhost = {
  id: 1337,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  testnet: true,
} as const satisfies Chain;

// Configure chains
export const chains = [sepolia, localhost] as const;

// Create a custom transport for localhost that always uses 'latest' block tag
// This prevents block number caching issues in local development
const localhostTransport = http('http://127.0.0.1:8545', {
  fetchOptions: {
    cache: 'no-store',
  },
  // Force recalculation of block numbers on each request
  batch: false, // Disable batching to avoid block number caching
});

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
    [localhost.id]: localhostTransport,
  },
  // Disable multicall batching for localhost to avoid block number issues
  batch: {
    multicall: false, // Disable multicall on localhost - it can cache block numbers
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
