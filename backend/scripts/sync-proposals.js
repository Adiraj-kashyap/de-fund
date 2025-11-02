import { ethers } from 'ethers'
import dotenv from 'dotenv'
import { getDatabase } from '../db/database.js'
import { MILESTONE_GOVERNANCE_ABI } from '../config/contracts.js'

dotenv.config()

const RPC_URL = process.env.RPC_URL || 'https://rpc.sepolia.org'
const CONTRACT_ADDRESSES = JSON.parse(process.env.CONTRACT_ADDRESSES || '{}')

const db = getDatabase()
const provider = new ethers.JsonRpcProvider(RPC_URL)

/**
 * Sync proposal votes from blockchain to database
 * Call this periodically to update vote counts
 */
async function syncProposals() {
  if (!CONTRACT_ADDRESSES.MilestoneGovernance) {
    console.log('MilestoneGovernance contract not configured')
    return
  }

  const governanceContract = new ethers.Contract(
    CONTRACT_ADDRESSES.MilestoneGovernance,
    MILESTONE_GOVERNANCE_ABI,
    provider
  )

  try {
    // Get all proposals from database
    const proposals = db.prepare(`
      SELECT id, proposal_id, contract_address FROM proposals
      WHERE executed = 0
    `).all()

    console.log(`Syncing ${proposals.length} proposals...`)

    for (const proposal of proposals) {
      try {
        // Fetch latest proposal data from blockchain
        const proposalData = await governanceContract.getProposal(proposal.proposal_id)
        const [stageIndex, evidenceHash, proposer, votingDeadline, votesFor, votesAgainst, executed, passed] = proposalData

        // Update database
        db.prepare(`
          UPDATE proposals
          SET votes_for = ?,
              votes_against = ?,
              executed = ?,
              passed = ?,
              updated_at = strftime('%s', 'now')
          WHERE id = ?
        `).run(
          votesFor.toString(),
          votesAgainst.toString(),
          executed ? 1 : 0,
          passed ? 1 : 0,
          proposal.id
        )

        console.log(`? Synced proposal ${proposal.proposal_id}`)
      } catch (error) {
        console.error(`Error syncing proposal ${proposal.proposal_id}:`, error.message)
      }
    }

    console.log('Sync complete')
  } catch (error) {
    console.error('Sync error:', error)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncProposals()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { syncProposals }
