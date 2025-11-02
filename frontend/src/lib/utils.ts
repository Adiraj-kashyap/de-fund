import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEther(value: bigint | number | string | null | undefined, decimals: number = 4): string {
  // Handle all types safely
  let valueBig: bigint;
  
  try {
    if (typeof value === 'bigint') {
      valueBig = value;
    } else if (value === null || value === undefined || value === '') {
      return '0.0000';
    } else if (typeof value === 'number') {
      // If already in ETH (not wei), return as is
      if (value < 1e12) {
        return value.toFixed(decimals);
      }
      valueBig = BigInt(Math.floor(value));
    } else if (typeof value === 'string') {
      const parsed = value.trim();
      if (parsed === '' || parsed === '0') {
        return '0.0000';
      }
      valueBig = BigInt(parsed);
    } else {
      return '0.0000';
    }
    
    const eth = Number(valueBig) / 1e18;
    return eth.toFixed(decimals);
  } catch {
    return '0.0000';
  }
}

export function parseEtherSafe(value: string): bigint {
  try {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) return 0n;
    return BigInt(Math.floor(parsed * 1e18));
  } catch {
    return 0n;
  }
}

export function calculatePercentage(current: bigint | number | string | null | undefined, total: bigint | number | string | null | undefined): number {
  // Convert to BigInt for safe arithmetic, handling all types
  let currentBig: bigint;
  let totalBig: bigint;
  
  try {
    if (typeof current === 'bigint') {
      currentBig = current;
    } else if (current === null || current === undefined || current === '') {
      currentBig = 0n;
    } else if (typeof current === 'number') {
      currentBig = BigInt(Math.floor(current));
    } else if (typeof current === 'string') {
      // Handle string that might be a number or BigInt string
      const parsed = current.trim();
      if (parsed === '' || parsed === '0') {
        currentBig = 0n;
      } else {
        currentBig = BigInt(parsed);
      }
    } else {
      currentBig = 0n;
    }
  } catch {
    currentBig = 0n;
  }
  
  try {
    if (typeof total === 'bigint') {
      totalBig = total;
    } else if (total === null || total === undefined || total === '') {
      totalBig = 1n; // Avoid division by zero
    } else if (typeof total === 'number') {
      totalBig = BigInt(Math.floor(total));
    } else if (typeof total === 'string') {
      // Handle string that might be a number or BigInt string
      const parsed = total.trim();
      if (parsed === '' || parsed === '0') {
        totalBig = 1n; // Avoid division by zero
      } else {
        totalBig = BigInt(parsed);
      }
    } else {
      totalBig = 1n;
    }
  } catch {
    totalBig = 1n;
  }
  
  if (totalBig === 0n) return 0;
  
  // Perform BigInt arithmetic
  try {
    return Number((currentBig * 10000n) / totalBig) / 100;
  } catch {
    return 0;
  }
}

export function formatTimeRemaining(seconds: bigint): string {
  const totalSeconds = Number(seconds);
  if (totalSeconds <= 0) return 'Ended';
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getProposalStatusText(status: number): string {
  const statuses = ['Pending', 'Active', 'Approved', 'Rejected', 'Executed'];
  return statuses[status] || 'Unknown';
}

export function getProposalStatusColor(status: number): string {
  const colors = ['gray', 'blue', 'green', 'red', 'purple'];
  return colors[status] || 'gray';
}
