import { formatEther, formatUnits } from 'viem'
import { format, formatDistanceToNow } from 'date-fns'

/**
 * Format ETH value with proper decimals
 */
export function formatETH(value, decimals = 4) {
  if (!value) return '0.0000'
  try {
    const formatted = formatEther(BigInt(value.toString()))
    return parseFloat(formatted).toFixed(decimals)
  } catch {
    return '0.0000'
  }
}

/**
 * Format token value
 */
export function formatToken(value, decimals = 18, displayDecimals = 2) {
  if (!value) return '0.00'
  try {
    const formatted = formatUnits(BigInt(value.toString()), decimals)
    return parseFloat(formatted).toFixed(displayDecimals)
  } catch {
    return '0.00'
  }
}

/**
 * Format address (show first 6 and last 4 characters)
 */
export function formatAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Format date/time
 */
export function formatDate(timestamp, formatStr = 'PPpp') {
  if (!timestamp) return 'N/A'
  try {
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp * 1000) 
      : new Date(timestamp)
    return format(date, formatStr)
  } catch {
    return 'Invalid date'
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return 'N/A'
  try {
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp * 1000) 
      : new Date(timestamp)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return 'Invalid date'
  }
}

/**
 * Format percentage
 */
export function formatPercentage(value, total, decimals = 1) {
  if (!total || total === 0n) return '0%'
  try {
    const percent = (Number(value) / Number(total)) * 100
    return `${percent.toFixed(decimals)}%`
  } catch {
    return '0%'
  }
}

/**
 * Format large numbers (e.g., 1.2K, 3.4M)
 */
export function formatCompactNumber(value) {
  if (!value) return '0'
  const num = typeof value === 'bigint' ? Number(value) : value
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return num.toString()
}
