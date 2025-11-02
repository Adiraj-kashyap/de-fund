const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * Upload a file to IPFS via backend API
 * @param {File} file - File to upload
 * @returns {Promise<{hash: string, url: string}>}
 */
export async function uploadToIPFS(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/api/ipfs/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to upload to IPFS')
  }

  return response.json()
}

/**
 * Upload JSON data to IPFS via backend API
 * @param {object} data - Data to upload
 * @returns {Promise<{hash: string, url: string}>}
 */
export async function uploadDataToIPFS(data) {
  const response = await fetch(`${API_URL}/api/ipfs/upload-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: JSON.stringify(data) }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to upload to IPFS')
  }

  return response.json()
}

/**
 * Get IPFS gateway URL for a hash
 * @param {string} hash - IPFS hash
 * @returns {string} Gateway URL
 */
export function getIPFSGatewayURL(hash) {
  const gateway = import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/'
  return `${gateway}${hash}`
}
