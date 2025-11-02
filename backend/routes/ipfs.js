import express from 'express'
import multer from 'multer'
import { create } from 'ipfs-http-client'
import FormData from 'form-data'
import fs from 'fs'

const router = express.Router()

// Configure IPFS client
const ipfsApiUrl = process.env.IPFS_API_URL || 'http://localhost:5001'
let ipfsClient = null

try {
  ipfsClient = create({ url: ipfsApiUrl })
  console.log('IPFS client initialized')
} catch (error) {
  console.warn('IPFS client initialization failed:', error.message)
  console.warn('IPFS features will be disabled')
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
    return res.status(503).json({ error: 'IPFS service unavailable' })
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const file = await ipfsClient.add({
      content: req.file.buffer,
      path: req.file.originalname
    })

    const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/'
    const url = `${gateway}${file.cid.toString()}`

    res.json({
      hash: file.cid.toString(),
      url,
      size: file.size
    })
  } catch (error) {
    console.error('IPFS upload error:', error)
    res.status(500).json({ error: 'Failed to upload to IPFS' })
  }
})

// Upload JSON/text data to IPFS
router.post('/upload-data', async (req, res) => {
  if (!ipfsClient) {
    return res.status(503).json({ error: 'IPFS service unavailable' })
  }

  try {
    const data = req.body.data || JSON.stringify(req.body)

    const file = await ipfsClient.add({
      content: Buffer.from(data)
    })

    const gateway = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/'
    const url = `${gateway}${file.cid.toString()}`

    res.json({
      hash: file.cid.toString(),
      url,
      size: file.size
    })
  } catch (error) {
    console.error('IPFS upload error:', error)
    res.status(500).json({ error: 'Failed to upload to IPFS' })
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
