// Contract addresses - Update these after deployment
export const CONTRACTS = {
  FUNDING_ESCROW: (import.meta.env.VITE_ESCROW_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  MILESTONE_GOVERNANCE: (import.meta.env.VITE_GOVERNANCE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
} as const;

export const CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '1337'; // Local development (1337) by default, use 11155111 for Sepolia

export const isContractsDeployed = () => {
  return (
    CONTRACTS.FUNDING_ESCROW !== '0x0000000000000000000000000000000000000000' &&
    CONTRACTS.MILESTONE_GOVERNANCE !== '0x0000000000000000000000000000000000000000'
  );
};
