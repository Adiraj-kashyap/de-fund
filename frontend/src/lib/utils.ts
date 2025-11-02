import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEther(value: bigint, decimals: number = 4): string {
  const eth = Number(value) / 1e18;
  return eth.toFixed(decimals);
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

export function calculatePercentage(current: bigint, total: bigint): number {
  if (total === 0n) return 0;
  return Number((current * 10000n) / total) / 100;
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
