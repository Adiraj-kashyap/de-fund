/**
 * Validation utilities for API endpoints
 */

export function validateAddress(address) {
  if (!address) return { valid: false, error: 'Address is required' }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { valid: false, error: 'Invalid Ethereum address format' }
  }
  return { valid: true }
}

export function validateProjectData(data) {
  const errors = []

  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required')
  }
  if (data.title && data.title.length > 200) {
    errors.push('Title must be less than 200 characters')
  }

  if (!data.fundingGoal || parseFloat(data.fundingGoal) <= 0) {
    errors.push('Funding goal must be greater than 0')
  }

  if (!data.deadline || parseInt(data.deadline) <= Date.now() / 1000) {
    errors.push('Deadline must be in the future')
  }

  if (!data.totalStages || parseInt(data.totalStages) < 1 || parseInt(data.totalStages) > 7) {
    errors.push('Total stages must be between 1 and 7')
  }

  if (!data.stageAllocations || !Array.isArray(data.stageAllocations)) {
    errors.push('Stage allocations must be an array')
  } else {
    const total = data.stageAllocations.reduce((sum, a) => sum + parseFloat(a || 0), 0)
    if (Math.abs(total - parseFloat(data.fundingGoal)) > 0.01) {
      errors.push('Stage allocations must sum to funding goal')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function validateIPFSHash(hash) {
  if (!hash) return { valid: false, error: 'IPFS hash is required' }
  // IPFS hashes can be CIDv0 (Qm...) or CIDv1 (bafy...)
  if (!/^[Qmb][a-zA-Z0-9]{44,}$/.test(hash)) {
    return { valid: false, error: 'Invalid IPFS hash format' }
  }
  return { valid: true }
}
