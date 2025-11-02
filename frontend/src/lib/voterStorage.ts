/**
 * Off-chain voter registration storage
 * Stores voter registration data in localStorage for testing/development
 * This persists across Hardhat resets
 */

const STORAGE_KEY = 'de-fund-voters';
const CHAIN_ID_KEY = 'de-fund-voter-chain-id';

export interface OffChainVoter {
  address: string;
  stakeAmount: string; // In wei (stored as string to avoid precision issues)
  reputation: number;
  isRegistered: boolean;
  registeredAt: number; // Timestamp
  registrationCount: number; // Track how many times registered (for testing)
}

/**
 * Get all registered voters from localStorage
 */
export function getOffChainVoters(): Record<string, OffChainVoter> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    const data = JSON.parse(stored);
    // Also check if chain ID changed - reset if so
    const storedChainId = localStorage.getItem(CHAIN_ID_KEY);
    const currentChainId = import.meta.env.VITE_CHAIN_ID || '1337';
    
    if (storedChainId !== currentChainId) {
      // Chain changed, clear old data
      clearOffChainVoters();
      localStorage.setItem(CHAIN_ID_KEY, currentChainId);
      return {};
    }
    
    return data;
  } catch (error) {
    console.error('Error reading voter storage:', error);
    return {};
  }
}

/**
 * Check if an address is registered (off-chain)
 */
export function isOffChainVoterRegistered(address?: string): boolean {
  if (!address) return false;
  const voters = getOffChainVoters();
  return voters[address.toLowerCase()]?.isRegistered || false;
}

/**
 * Get voter info from localStorage
 */
export function getOffChainVoterInfo(address?: string): OffChainVoter | null {
  if (!address) return null;
  const voters = getOffChainVoters();
  return voters[address.toLowerCase()] || null;
}

/**
 * Register a voter off-chain
 */
export function registerOffChainVoter(address: string, stakeAmount: bigint): OffChainVoter {
  const voters = getOffChainVoters();
  const addressLower = address.toLowerCase();
  
  const existing = voters[addressLower];
  const registrationCount = existing ? existing.registrationCount + 1 : 1;
  
  const voter: OffChainVoter = {
    address: addressLower,
    stakeAmount: stakeAmount.toString(),
    reputation: existing?.reputation || 100, // Preserve existing reputation or start at 100
    isRegistered: true,
    registeredAt: existing?.registeredAt || Date.now(), // Preserve original registration time
    registrationCount, // Track re-registrations for testing
  };
  
  voters[addressLower] = voter;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(voters));
    const currentChainId = import.meta.env.VITE_CHAIN_ID || '1337';
    localStorage.setItem(CHAIN_ID_KEY, currentChainId);
  } catch (error) {
    console.error('Error saving voter storage:', error);
  }
  
  return voter;
}

/**
 * Clear all off-chain voter data
 */
export function clearOffChainVoters(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CHAIN_ID_KEY);
}

/**
 * Remove a specific voter
 */
export function removeOffChainVoter(address: string): void {
  const voters = getOffChainVoters();
  delete voters[address.toLowerCase()];
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(voters));
  } catch (error) {
    console.error('Error removing voter:', error);
  }
}

