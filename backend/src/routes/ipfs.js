import express from 'express';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload file to Pinata IPFS
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    const { PINATA_API_KEY, PINATA_SECRET_KEY } = process.env;

    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: 'IPFS upload not configured',
      });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    // Add optional metadata
    if (req.body.name) {
      const metadata = JSON.stringify({
        name: req.body.name,
      });
      formData.append('pinataMetadata', metadata);
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.statusText}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      data: {
        hash: data.IpfsHash,
        size: data.PinSize,
        timestamp: data.Timestamp,
        url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Upload JSON to Pinata
router.post('/upload-json', async (req, res, next) => {
  try {
    const { data: jsonData, name } = req.body;

    if (!jsonData) {
      return res.status(400).json({
        success: false,
        error: 'No JSON data provided',
      });
    }

    const { PINATA_API_KEY, PINATA_SECRET_KEY } = process.env;

    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: 'IPFS upload not configured',
      });
    }

    const body = {
      pinataContent: jsonData,
      pinataMetadata: name ? { name } : undefined,
    };

    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.statusText}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      data: {
        hash: data.IpfsHash,
        size: data.PinSize,
        timestamp: data.Timestamp,
        url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get IPFS content
router.get('/:hash', async (req, res, next) => {
  try {
    const { hash } = req.params;
    const gateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
    
    const response = await fetch(`${gateway}${hash}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch from IPFS');
    }

    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      res.json({ success: true, data });
    } else {
      // For images and other files, proxy the response
      res.set('Content-Type', contentType);
      response.body.pipe(res);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
