import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * Deploy a FundingEscrow contract for a new project
 * POST /api/deploy/project
 * Body: {
 *   projectOwner: string,
 *   fundingGoal: string (wei),
 *   fundingDuration: number (seconds),
 *   totalStages: number,
 *   stageAllocations: number[] (basis points, e.g., [2000, 2000, 2000, 2000, 2000] = 20% each)
 * }
 */
router.post('/project', async (req, res, next) => {
  try {
    const { projectOwner, fundingGoal, fundingDuration, totalStages, stageAllocations } = req.body;

    // Validate inputs
    if (!projectOwner || !fundingGoal || !fundingDuration || !totalStages || !stageAllocations) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Validate stage allocations sum to 10000 (100%)
    const totalAllocation = stageAllocations.reduce((sum, val) => sum + val, 0);
    if (totalAllocation !== 10000) {
      return res.status(400).json({
        success: false,
        error: 'Stage allocations must sum to 10000 (100%)',
      });
    }

    // Get governance address from env
    const governanceAddress = process.env.GOVERNANCE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

    // Deploy using Hardhat script
    const blockchainDir = path.resolve(__dirname, '../../../blockchain');
    const deployScript = path.resolve(blockchainDir, 'scripts/deployProject.js');
    
    // Build command to run Hardhat deployment
    // Use -- separator to pass arguments properly
    const allocationsStr = JSON.stringify(stageAllocations);
    // Escape quotes in JSON for Windows command line
    const escapedAllocations = allocationsStr.replace(/"/g, '\\"');
    const command = `cd "${blockchainDir}" && npx hardhat run ${deployScript} --network hardhat -- ${projectOwner} ${fundingGoal} ${fundingDuration} ${totalStages} "${escapedAllocations}" ${governanceAddress}`;

    console.log('📦 Deploying FundingEscrow contract...');
    console.log('  Project Owner:', projectOwner);
    console.log('  Funding Goal:', fundingGoal);
    console.log('  Duration:', fundingDuration);
    console.log('  Stages:', totalStages);

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      env: { ...process.env },
    });

    // Parse the output to extract contract address
    // Look for "CONTRACT_ADDRESS:" line or any 0x address
    let contractAddress = null;
    
    // Try to find the marked address first
    const markedMatch = stdout.match(/CONTRACT_ADDRESS:\s*(0x[a-fA-F0-9]{40})/);
    if (markedMatch) {
      contractAddress = markedMatch[1];
    } else {
      // Fallback: find any valid Ethereum address
      const addressMatch = stdout.match(/0x[a-fA-F0-9]{40}/);
      if (addressMatch) {
        contractAddress = addressMatch[0];
      }
    }
    
    if (!contractAddress) {
      console.error('Deployment output:', stdout);
      console.error('Deployment errors:', stderr);
      return res.status(500).json({
        success: false,
        error: 'Failed to deploy contract - address not found in output',
        details: stderr || stdout,
      });
    }
    console.log('✅ Contract deployed to:', contractAddress);

    res.json({
      success: true,
      data: {
        contractAddress,
      },
    });
  } catch (error) {
    console.error('❌ Deployment error:', error);
    next(error);
  }
});

export default router;

