import { ethers } from 'ethers'
import dotenv from 'dotenv'
import { getDatabase } from '../db/database.js'
import { FUNDING_ESCROW_ABI, MILESTONE_GOVERNANCE_ABI } from '../config/contracts.js'

dotenv.config()

const RPC_URL = process.env.RPC_URL || 'https://rpc.sepolia.org'
const CONTRACT_ADDRESSES = JSON.parse(process.env.CONTRACT_ADDRESSES || '{}')

const db = getDatabase()
const provider = new ethers.JsonRpcProvider(RPC_URL)

// Contract instances
let escrowContract = null
let governanceContract = null

if (CONTRACT_ADDRESSES.FundingEscrow) {
  escrowContract = new ethers.Contract(
    CONTRACT_ADDRESSES.FundingEscrow,
    FUNDING_ESCROW_ABI,
    provider
  )
}

if (CONTRACT_ADDRESSES.MilestoneGovernance) {
  governanceContract = new ethers.Contract(
    CONTRACT_ADDRESSES.MilestoneGovernance,
    MILESTONE_GOVERNANCE_ABI,
    provider
  )
}

// Get last indexed block
function getLastBlockNumber() {
  const result = db.prepare(`
    SELECT MAX(block_number) as last_block FROM events
  `).get()
  return result?.last_block || 0
}

// Index FundingEscrow events
async function indexEscrowEvents(fromBlock, toBlock) {
  if (!escrowContract) {
    console.log('FundingEscrow contract not configured')
    return
  }

  try {
    // Index FundsDonated events
    const donatedFilter = escrowContract.filters.FundsDonated()
    const donatedEvents = await escrowContract.queryFilter(donatedFilter, fromBlock, toBlock)

    for (const event of donatedEvents) {
      const [donor, amount, totalRaised] = event.args
      db.prepare(`
        INSERT OR IGNORE INTO events (
          contract_address, event_name, block_number, transaction_hash, log_index, data
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        CONTRACT_ADDRESSES.FundingEscrow,
        'FundsDonated',
        event.blockNumber,
        event.transactionHash,
        event.index,
        JSON.stringify({
          donor: donor.toLowerCase(),
          amount: amount.toString(),
          totalRaised: totalRaised.toString()
        })
      )
    }

    // Index FundsReleased events
    const releasedFilter = escrowContract.filters.FundsReleased()
    const releasedEvents = await escrowContract.queryFilter(releasedFilter, fromBlock, toBlock)

    for (const event of releasedEvents) {
      const [stage, amount] = event.args
      db.prepare(`
        INSERT OR IGNORE INTO events (
          contract_address, event_name, block_number, transaction_hash, log_index, data
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        CONTRACT_ADDRESSES.FundingEscrow,
        'FundsReleased',
        event.blockNumber,
        event.transactionHash,
        event.index,
        JSON.stringify({
          stage: stage.toString(),
          amount: amount.toString()
        })
      )
    }

    console.log(`Indexed ${donatedEvents.length} FundsDonated and ${releasedEvents.length} FundsReleased events`)
  } catch (error) {
    console.error('Error indexing escrow events:', error)
  }
}

// Index MilestoneGovernance events
async function indexGovernanceEvents(fromBlock, toBlock) {
  if (!governanceContract) {
    console.log('MilestoneGovernance contract not configured')
    return
  }

  try {
    // Index ProposalCreated events
    const proposalFilter = governanceContract.filters.ProposalCreated()
    const proposalEvents = await governanceContract.queryFilter(proposalFilter, fromBlock, toBlock)

    for (const event of proposalEvents) {
      const [proposalId, stageIndex, proposer, evidenceHash, votingDeadline] = event.args
      
      // Store in proposals table
      db.prepare(`
        INSERT OR REPLACE INTO proposals (
          proposal_id, contract_address, stage_index, evidence_hash, proposer, voting_deadline
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        proposalId.toString(),
        CONTRACT_ADDRESSES.MilestoneGovernance,
        stageIndex.toString(),
        evidenceHash,
        proposer.toLowerCase(),
        votingDeadline.toString()
      )

      // Store in events table
      db.prepare(`
        INSERT OR IGNORE INTO events (
          contract_address, event_name, block_number, transaction_hash, log_index, data
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        CONTRACT_ADDRESSES.MilestoneGovernance,
        'ProposalCreated',
        event.blockNumber,
        event.transactionHash,
        event.index,
        JSON.stringify({
          proposalId: proposalId.toString(),
          stageIndex: stageIndex.toString(),
          proposer: proposer.toLowerCase(),
          evidenceHash,
          votingDeadline: votingDeadline.toString()
        })
      )
    }

    // Index VoteCast events
    const voteFilter = governanceContract.filters.VoteCast()
    const voteEvents = await governanceContract.queryFilter(voteFilter, fromBlock, toBlock)

    for (const event of voteEvents) {
      const [proposalId, voter, inFavor, weight] = event.args
      db.prepare(`
        INSERT OR IGNORE INTO events (
          contract_address, event_name, block_number, transaction_hash, log_index, data
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        CONTRACT_ADDRESSES.MilestoneGovernance,
        'VoteCast',
        event.blockNumber,
        event.transactionHash,
        event.index,
        JSON.stringify({
          proposalId: proposalId.toString(),
          voter: voter.toLowerCase(),
          inFavor,
          weight: weight.toString()
        })
      )
    }

    // Index ProposalExecuted events
    const executedFilter = governanceContract.filters.ProposalExecuted()
    const executedEvents = await governanceContract.queryFilter(executedFilter, fromBlock, toBlock)

    for (const event of executedEvents) {
      const [proposalId, passed] = event.args
      
      // Update proposal status
      db.prepare(`
        UPDATE proposals
        SET executed = 1, passed = ?, updated_at = strftime('%s', 'now')
        WHERE contract_address = ? AND proposal_id = ?
      `).run(
        passed ? 1 : 0,
        CONTRACT_ADDRESSES.MilestoneGovernance,
        proposalId.toString()
      )

      db.prepare(`
        INSERT OR IGNORE INTO events (
          contract_address, event_name, block_number, transaction_hash, log_index, data
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        CONTRACT_ADDRESSES.MilestoneGovernance,
        'ProposalExecuted',
        event.blockNumber,
        event.transactionHash,
        event.index,
        JSON.stringify({
          proposalId: proposalId.toString(),
          passed
        })
      )
    }

    console.log(`Indexed ${proposalEvents.length} proposals, ${voteEvents.length} votes, ${executedEvents.length} executions`)
  } catch (error) {
    console.error('Error indexing governance events:', error)
  }
}

// Main indexing function
async function indexBlocks() {
  const lastBlock = getLastBlockNumber()
  const currentBlock = await provider.getBlockNumber()
  const fromBlock = Math.max(lastBlock - 100, 0) // Start 100 blocks back to catch any missed events
  const toBlock = currentBlock

  if (fromBlock >= toBlock) {
    console.log('No new blocks to index')
    return
  }

  console.log(`Indexing blocks ${fromBlock} to ${toBlock}`)

  await indexEscrowEvents(fromBlock, toBlock)
  await indexGovernanceEvents(fromBlock, toBlock)

  console.log('Indexing complete')
}

// Run indexer
if (import.meta.url === `file://${process.argv[1]}`) {
  indexBlocks()
    .then(() => {
      console.log('Indexer finished')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Indexer error:', error)
      process.exit(1)
    })
}

export { indexBlocks }
