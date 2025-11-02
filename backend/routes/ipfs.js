import express from 'express'
import multer from 'multer'
import { create } from 'ipfs-http-client'

const router = express.Router()

// Configure IPFS client
const ipfsApiUrl = process.env.IPFS_API_URL || 'http://localhost:5001'
let ipfsClient = null

try {
  // IPFS HTTP client v60+ uses different API
  ipfsClient = create({
    url: ipfsApiUrl,
  })
  console.log('IPFS client initialized at', ipfsApiUrl)
} catch (error) {
  console.warn('IPFS client initialization failed:', error.message)
  console.warn('IPFS features will be disabled. Install IPFS node or use public gateway.')
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

// Upload file to IPFS
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!ipfsClient) {
    return res.status(503).json({ 
      error: 'IPFS service unavailable',
      message: 'Please install IPFS node or configure IPFS_API_URL'
    })
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    // Use addAll for newer IPFS client API
    const result = await ipfsClient.add({
      content: req.file.buffer,
    }, {
      pin: true,
      wrapWithDirectory: false
    })

    // Handle both single result and array result
    const cid = Array.isArray(result) ? result[0].cid : result.cid
    const size = Array.isArray(result) ? result[0].size : result.size

    const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/'
    const url = `${gateway}${cid.toString()}`

    res.json({
      hash: cid.toString(),
      url,
      size: size || req.file.size
    })
  } catch (error) {
    console.error('IPFS upload error:', error)
    res.status(500).json({ error: 'Failed to upload to IPFS', details: error.message })
  }
})

// Upload JSON/text data to IPFS
router.post('/upload-data', async (req, res) => {
  if (!ipfsClient) {
    return res.status(503).json({ 
      error: 'IPFS service unavailable',
      message: 'Please install IPFS node or configure IPFS_API_URL'
    })
  }

  try {
    const data = req.body.data || JSON.stringify(req.body)
    const buffer = Buffer.from(data, 'utf-8')

    const result = await ipfsClient.add({
      content: buffer,
    }, {
      pin: true
    })

    const cid = Array.isArray(result) ? result[0].cid : result.cid
    const size = Array.isArray(result) ? result[0].size : result.size

    const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/'
    const url = `${gateway}${cid.toString()}`

    res.json({
      hash: cid.toString(),
      url,
      size: size || buffer.length
    })
  } catch (error) {
    console.error('IPFS upload error:', error)
    res.status(500).json({ error: 'Failed to upload to IPFS', details: error.message })
  }
})

// Get file from IPFS
router.get('/:hash', async (req, res) => {
  if (!ipfsClient) {
    return res.status(503).json({ error: 'IPFS service unavailable' })
  }

  try {
    const hash = req.params.hash
    const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/'
    
    // Redirect to IPFS gateway
    res.redirect(`${gateway}${hash}`)
  } catch (error) {
    console.error('IPFS retrieval error:', error)
    res.status(500).json({ error: 'Failed to retrieve from IPFS' })
  }
})

export default router
