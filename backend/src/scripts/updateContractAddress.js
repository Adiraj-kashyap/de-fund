import db, { query } from '../db/database.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Update a project's contract address
 * Usage: node src/scripts/updateContractAddress.js <project_id_or_address> <new_contract_address>
 */
async function updateContractAddress(projectIdentifier, newContractAddress) {
  try {
    console.log('🔄 Updating contract address...');
    console.log('  Project:', projectIdentifier);
    console.log('  New Contract:', newContractAddress);
    
    // Validate contract address format
    if (!newContractAddress.match(/^0x[a-fA-F0-9]{40}$/i)) {
      throw new Error('Invalid contract address format');
    }
    
    // Check if projectIdentifier is an ID (number) or address
    let result;
    if (/^\d+$/.test(projectIdentifier)) {
      // It's an ID
      result = await query(`
        UPDATE projects
        SET contract_address = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newContractAddress.toLowerCase(), parseInt(projectIdentifier)]);
    } else {
      // It's an address
      result = await query(`
        UPDATE projects
        SET contract_address = $1, updated_at = CURRENT_TIMESTAMP
        WHERE LOWER(contract_address) = LOWER($2)
      `, [newContractAddress.toLowerCase(), projectIdentifier]);
    }
    
    if (result.rowCount === 0) {
      console.log('❌ Project not found');
      return false;
    }
    
    console.log('✅ Contract address updated successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// If called from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectId = process.argv[2];
  const newAddress = process.argv[3];
  
  if (!projectId || !newAddress) {
    console.log('Usage: node updateContractAddress.js <project_id_or_address> <new_contract_address>');
    console.log('Example: node updateContractAddress.js 1 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9');
    process.exit(1);
  }
  
  updateContractAddress(projectId, newAddress)
    .then((success) => {
      process.exit(success ? 0 : 1);
    });
}

export { updateContractAddress };

