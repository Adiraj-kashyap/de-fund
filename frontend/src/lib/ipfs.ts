/**
 * IPFS Integration Module
 * Handles uploading and retrieving files from IPFS
 */

const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';

/**
 * Upload a file to IPFS using a public gateway or service
 * In production, use services like Pinata, NFT.Storage, or Web3.Storage
 */
export async function uploadToIPFS(file: File): Promise<string> {
  // This is a placeholder. In production, integrate with:
  // - Pinata: https://www.pinata.cloud/
  // - NFT.Storage: https://nft.storage/
  // - Web3.Storage: https://web3.storage/
  
  try {
    // Example using Pinata API
    const formData = new FormData();
    formData.append('file', file);

    // Note: You need to set up Pinata API keys
    const pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
    const pinataSecretKey = import.meta.env.VITE_PINATA_SECRET_KEY;

    if (!pinataApiKey || !pinataSecretKey) {
      throw new Error('IPFS upload not configured. Please set up Pinata API keys.');
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload to IPFS');
    }

    const data = await response.json();
    return data.IpfsHash;
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new Error('Failed to upload file to IPFS');
  }
}

/**
 * Upload JSON data to IPFS
 */
export async function uploadJSONToIPFS(data: Record<string, any>): Promise<string> {
  try {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const file = new File([blob], 'data.json', { type: 'application/json' });
    return await uploadToIPFS(file);
  } catch (error) {
    console.error('IPFS JSON upload error:', error);
    throw new Error('Failed to upload JSON to IPFS');
  }
}

/**
 * Get the full IPFS URL for a hash
 */
export function getIPFSUrl(hash: string): string {
  if (!hash) return '';
  // Remove ipfs:// prefix if present
  const cleanHash = hash.replace('ipfs://', '');
  return `${IPFS_GATEWAY}${cleanHash}`;
}

/**
 * Fetch data from IPFS
 */
export async function fetchFromIPFS<T = any>(hash: string): Promise<T> {
  try {
    const url = getIPFSUrl(hash);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch from IPFS');
    }
    
    return await response.json();
  } catch (error) {
    console.error('IPFS fetch error:', error);
    throw new Error('Failed to fetch data from IPFS');
  }
}

/**
 * Validate if a string is a valid IPFS hash
 */
export function isValidIPFSHash(hash: string): boolean {
  // Basic validation for IPFS CIDv0 (Qm...) and CIDv1 (b...)
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58})$/.test(hash);
}

/**
 * Mock upload function for testing (generates a fake hash)
 * Remove this in production
 */
export function mockIPFSUpload(fileName: string): string {
  // Generate a fake but valid-looking IPFS hash
  const fakeHash = 'Qm' + Math.random().toString(36).substring(2, 46).padEnd(44, 'x');
  console.log(`Mock IPFS upload: ${fileName} -> ${fakeHash}`);
  return fakeHash;
}
