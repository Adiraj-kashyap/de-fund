import express from 'express';
import { query, execute } from '../db/database.js';

const router = express.Router();

// Get all projects
router.get('/', async (req, res, next) => {
  try {
    const { status, category, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT p.*, u.username as owner_username,
        (SELECT COUNT(*) FROM donations WHERE project_id = p.id) as donor_count,
        COALESCE((SELECT SUM(CAST(amount AS REAL)) FROM donations WHERE project_id = p.id), 0) as funds_raised
      FROM projects p
      LEFT JOIN users u ON p.owner_address = u.wallet_address
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND p.status = $${paramIndex++}`;
      params.push(status);
    }

    if (category) {
      sql += ` AND p.category = $${paramIndex++}`;
      params.push(category);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: result.rowCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get project by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const projectResult = await query(`
      SELECT p.*, u.username as owner_username,
        (SELECT COUNT(*) FROM donations WHERE project_id = p.id) as donor_count,
        COALESCE((SELECT SUM(CAST(amount AS REAL)) FROM donations WHERE project_id = p.id), 0) as funds_raised
      FROM projects p
      LEFT JOIN users u ON p.owner_address = u.wallet_address
      WHERE p.id = $1
    `, [id]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Get milestones
    const milestonesResult = await query(`
      SELECT * FROM milestones
      WHERE project_id = $1
      ORDER BY stage_index ASC
    `, [project.id]);

    project.milestones = milestonesResult.rows;

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// Get project by contract address
router.get('/contract/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    const result = await query(`
      SELECT p.*, u.username as owner_username,
        (SELECT COUNT(*) FROM donations WHERE project_id = p.id) as donor_count,
        COALESCE((SELECT SUM(CAST(amount AS REAL)) FROM donations WHERE project_id = p.id), 0) as funds_raised
      FROM projects p
      LEFT JOIN users u ON p.owner_address = u.wallet_address
      WHERE LOWER(p.contract_address) = LOWER($1)
    `, [address]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const project = result.rows[0];

    // Get milestones
    const milestonesResult = await query(`
      SELECT * FROM milestones
      WHERE project_id = $1
      ORDER BY stage_index ASC
    `, [project.id]);

    project.milestones = milestonesResult.rows;

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// Update project contract address (for manually deployed contracts)
router.patch('/:id/contract-address', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { contractAddress } = req.body;
    
    if (!contractAddress || !contractAddress.match(/^0x[a-fA-F0-9]{40}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract address format',
      });
    }
    
    const result = await execute(`
      UPDATE projects
      SET contract_address = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [contractAddress.toLowerCase(), id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Contract address updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Update project contract address by current address (alternative)
router.patch('/contract/:address/update-contract', async (req, res, next) => {
  try {
    const { address } = req.params;
    const { contractAddress } = req.body;
    
    if (!contractAddress || !contractAddress.match(/^0x[a-fA-F0-9]{40}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract address format',
      });
    }
    
    const result = await execute(`
      UPDATE projects
      SET contract_address = $1, updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(contract_address) = LOWER($2)
    `, [contractAddress.toLowerCase(), address]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Contract address updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Create new project (with automatic contract deployment)
router.post('/', async (req, res, next) => {
  try {
    const {
      contract_address, // Optional: for manual deployment
      owner_address, // Project creator's wallet address (gets 20% stake)
      title,
      description,
      category,
      image_url,
      funding_goal,
      funding_deadline,
      total_stages,
      milestones,
    } = req.body;

    // Validate required fields first
    if (!owner_address || !title || !description || !funding_goal || !funding_deadline || !total_stages) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: owner_address, title, description, funding_goal, funding_deadline, total_stages',
      });
    }

    // Validate owner address format
    if (!owner_address || !owner_address.match(/^0x[a-fA-F0-9]{40}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid owner address format',
      });
    }

    // Check if contract_address is provided (manual deployment) or needs auto-deployment
    const isManualDeployment = contract_address && 
                               typeof contract_address === 'string' && 
                               contract_address.trim() !== '' &&
                               contract_address.match(/^0x[a-fA-F0-9]{40}$/i);

    let contractAddress = null;
    
    if (isManualDeployment) {
      // Manual deployment - use provided contract address
      // Check if this address already exists in database
      const existingProject = await query(`
        SELECT id, title FROM projects WHERE LOWER(contract_address) = LOWER($1)
      `, [contract_address.trim().toLowerCase()]);
      
      if (existingProject.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Project with this contract address already exists',
          hint: `This contract address is already assigned to project "${existingProject.rows[0].title}" (ID: ${existingProject.rows[0].id})`,
          suggestion: 'Please deploy a new contract or use a different address.',
        });
      }
      
      console.log('📦 Using manual contract address for project:', title);
      contractAddress = contract_address.trim().toLowerCase();
    } else {
      // Step 1: Automatically deploy smart contract for this project
      console.log('📦 Auto-deploying contract for project:', title);
    
      try {
        // Calculate stage allocations from milestones
        const stageAllocations = milestones && milestones.length > 0
          ? milestones.map(m => Math.floor((m.allocation_percentage || 0) * 100)) // Convert % to basis points
          : Array(total_stages).fill(Math.floor(10000 / total_stages)); // Equal distribution
        
        // Ensure allocations sum to 10000 (100%)
        const total = stageAllocations.reduce((sum, val) => sum + val, 0);
        if (total !== 10000) {
          // Normalize to 10000
          const factor = 10000 / total;
          for (let i = 0; i < stageAllocations.length; i++) {
            stageAllocations[i] = Math.floor(stageAllocations[i] * factor);
          }
          // Adjust last one to ensure sum is exactly 10000
          const finalSum = stageAllocations.reduce((sum, val) => sum + val, 0);
          stageAllocations[stageAllocations.length - 1] += (10000 - finalSum);
        }

        // Calculate funding duration in seconds
        const deadlineTimestamp = parseInt(funding_deadline);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const fundingDuration = Math.max(1, deadlineTimestamp - currentTimestamp); // At least 1 second

        // Import deployment function
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const fs = await import('fs');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const blockchainDir = path.resolve(__dirname, '../../../blockchain');
        const governanceAddress = process.env.GOVERNANCE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
        
        // Prepare deployment config as environment variables (avoids command line argument parsing issues)
        const deploymentEnv = {
          ...process.env,
          DEPLOYMENT_PROJECT_OWNER: owner_address,
          DEPLOYMENT_FUNDING_GOAL: funding_goal,
          DEPLOYMENT_FUNDING_DURATION: fundingDuration.toString(),
          DEPLOYMENT_TOTAL_STAGES: total_stages.toString(),
          DEPLOYMENT_STAGE_ALLOCATIONS: JSON.stringify(stageAllocations),
          DEPLOYMENT_GOVERNANCE_ADDRESS: governanceAddress,
        };
        
        console.log('  Deploying with params:', {
          projectOwner: owner_address,
          fundingGoal: funding_goal,
          fundingDuration,
          totalStages: total_stages,
          allocations: stageAllocations,
        });

        // Use absolute path and set cwd to avoid cd && issues on Windows
        const deployScript = 'scripts/deployProject.js';
        const command = `npx hardhat run ${deployScript} --network localhost`;
        
        console.log('  Running command:', command);
        console.log('  Working directory:', blockchainDir);

        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 10 * 1024 * 1024,
          env: deploymentEnv,
          cwd: blockchainDir, // Set working directory here instead of using cd &&
          timeout: 60000, // 60 second timeout
        });

        // Log output for debugging
        if (stdout) console.log('  Deployment stdout:', stdout.substring(0, 500));
        if (stderr) console.warn('  Deployment stderr:', stderr.substring(0, 500));

        // Parse contract address from output
        const markedMatch = stdout.match(/CONTRACT_ADDRESS:\s*(0x[a-fA-F0-9]{40})/);
        if (markedMatch) {
          contractAddress = markedMatch[1];
        } else {
          const addressMatch = stdout.match(/0x[a-fA-F0-9]{40}/);
          if (addressMatch) {
            contractAddress = addressMatch[0];
          }
        }

        if (contractAddress) {
          console.log('✅ Contract deployed successfully:', contractAddress);
        } else {
          throw new Error(`Contract address not found in deployment output. stdout: ${stdout.substring(0, 200)}, stderr: ${stderr?.substring(0, 200) || 'none'}`);
        }

      } catch (deployError) {
        console.error('❌ Auto-deployment failed:', deployError.message);
        console.error('   Error details:', deployError);
        
        // Check if Hardhat node might not be running
        const isConnectionError = deployError.message?.includes('ECONNREFUSED') || 
                                  deployError.message?.includes('connect') ||
                                  deployError.code === 'ECONNREFUSED';
        
        const isTimeoutError = deployError.code === 'ETIMEDOUT' || deployError.signal === 'SIGTERM';
        
        // Fallback: Use contract address from .env if deployment fails
        const fallbackAddress = process.env.FALLBACK_CONTRACT_ADDRESS;
        if (fallbackAddress && fallbackAddress.match(/^0x[a-fA-F0-9]{40}$/i)) {
          // Check if fallback address is already used
          const existingProject = await query(`
            SELECT id, title FROM projects WHERE LOWER(contract_address) = LOWER($1)
          `, [fallbackAddress.toLowerCase()]);
          
          if (existingProject.rows.length > 0) {
            console.error(`❌ Fallback contract address ${fallbackAddress} already used by project "${existingProject.rows[0].title}" (ID: ${existingProject.rows[0].id})`);
            
            return res.status(409).json({
              success: false,
              error: 'Contract deployment failed and fallback address is already in use',
              hint: `The fallback contract address (${fallbackAddress}) is already assigned to project "${existingProject.rows[0].title}" (ID: ${existingProject.rows[0].id})`,
              suggestion: 'Deploy a new contract manually or ensure the Hardhat node is running for automatic deployment.',
              details: {
                deploymentError: deployError.message,
                fallbackAddress: fallbackAddress,
                existingProjectId: existingProject.rows[0].id,
              },
            });
          }
          
          console.log('⚠️  Using fallback contract address from .env:', fallbackAddress);
          contractAddress = fallbackAddress;
        } else {
          console.error('❌ No fallback contract address in .env - project creation failed');
          
          let errorMessage = 'Contract deployment failed';
          let suggestion = 'Set FALLBACK_CONTRACT_ADDRESS in backend/.env for manual deployment, or use Manual Deployment mode in the frontend.';
          
          if (isConnectionError) {
            errorMessage = 'Cannot connect to Hardhat node. Make sure Hardhat node is running: `npx hardhat node`';
            suggestion = '1. Start Hardhat node: `cd blockchain && npx hardhat node`\n2. Or use Manual Deployment mode in the frontend';
          } else if (isTimeoutError) {
            errorMessage = 'Contract deployment timed out';
            suggestion = 'Check if Hardhat node is responsive. Try using Manual Deployment mode instead.';
          }
          
          return res.status(500).json({
            success: false,
            error: errorMessage,
            details: deployError.message || String(deployError),
            suggestion: suggestion,
            hint: 'You can also deploy the contract manually using: `npx hardhat run scripts/deployManually.js --network hardhat`',
          });
        }
      }
    }

    // Validate we have a contract address (either deployed, fallback, or manual)
    if (!contractAddress || typeof contractAddress !== 'string' || !contractAddress.match(/^0x[a-fA-F0-9]{40}$/i)) {
      return res.status(500).json({
        success: false,
        error: 'Invalid or missing contract address - cannot create project',
        details: `Got: ${contractAddress ? `"${contractAddress}" (type: ${typeof contractAddress})` : 'undefined or null'}`,
        suggestion: 'Start Hardhat node for automatic deployment, or provide a valid contract address for manual deployment.',
      });
    }

    // Create user if doesn't exist
    await query(`
      INSERT INTO users (wallet_address)
      VALUES ($1)
      ON CONFLICT (wallet_address) DO NOTHING
    `, [owner_address.toLowerCase()]);

    // Double-check that contract address is unique before inserting
    // (This should not be necessary due to DB constraint, but provides better error messages)
    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        error: 'Contract address is required',
        hint: 'Either deploy a contract automatically (ensure Hardhat node is running) or provide a manual contract address.',
      });
    }
    
    const existingCheck = await query(`
      SELECT id, title FROM projects WHERE LOWER(contract_address) = LOWER($1)
    `, [contractAddress.toLowerCase()]);
    
    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Project with this contract address already exists',
        hint: `This contract address is already assigned to project "${existingCheck.rows[0].title}" (ID: ${existingCheck.rows[0].id})`,
        suggestion: 'Please deploy a new contract or use a different address.',
        contractAddress: contractAddress,
      });
    }
    
    // Insert project with deployed contract address
    const insertResult = await execute(`
      INSERT INTO projects (
        contract_address, owner_address, title, description,
        category, image_url, funding_goal, funding_deadline, total_stages
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      contractAddress.toLowerCase(),
      owner_address.toLowerCase(),
      title,
      description,
      category || 'other',
      image_url,
      funding_goal,
      funding_deadline,
      total_stages,
    ]);

    // Get the inserted project with contract address
    const projectResult = await query(`
      SELECT * FROM projects WHERE id = $1
    `, [insertResult.lastInsertRowid]);

    const project = projectResult.rows[0];
    
    // Include contract_address in response for frontend
    project.contract_address = contractAddress;

    // Insert milestones
    if (milestones && milestones.length > 0) {
      for (const milestone of milestones) {
        await query(`
          INSERT INTO milestones (
            project_id, stage_index, title, description, allocation_percentage
          )
          VALUES ($1, $2, $3, $4, $5)
        `, [
          project.id,
          milestone.stage_index,
          milestone.title,
          milestone.description || '',
          milestone.allocation_percentage,
        ]);
      }
    }

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    // SQLite unique constraint violation
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'Project with this contract address already exists',
      });
    }
    next(error);
  }
});

// Get project donations
router.get('/:id/donations', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT d.*, u.username as donor_username
      FROM donations d
      LEFT JOIN users u ON d.donor_address = u.wallet_address
      WHERE d.project_id = $1
      ORDER BY d.created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Get project updates
router.get('/:id/updates', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT * FROM project_updates
      WHERE project_id = $1
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Add project update
router.post('/:id/updates', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required',
      });
    }

    const result = await execute(`
      INSERT INTO project_updates (project_id, title, content)
      VALUES ($1, $2, $3)
    `, [id, title, content]);

    const updateResult = await query(`
      SELECT * FROM project_updates WHERE id = $1
    `, [result.lastInsertRowid]);

    res.status(201).json({
      success: true,
      data: updateResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;
