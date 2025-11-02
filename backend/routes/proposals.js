import express from 'express'
import { getDatabase } from '../db/database.js'

const router = express.Router()
const db = getDatabase()

// Get all proposals
router.get('/', (req, res) => {
  try {
    const proposals = db.prepare(`
      SELECT p.*, pr.title as project_title
      FROM proposals p
      LEFT JOIN projects pr ON p.contract_address = pr.contract_address
      WHERE p.executed = 0
      ORDER BY p.created_at DESC
    `).all()

    res.json(proposals)
  } catch (error) {
    console.error('Error fetching proposals:', error)
    res.status(500).json({ error: 'Failed to fetch proposals' })
  }
})

// Get proposal by ID
router.get('/:id', (req, res) => {
  try {
    const proposal = db.prepare(`
      SELECT p.*, pr.title as project_title
      FROM proposals p
      LEFT JOIN projects pr ON p.contract_address = pr.contract_address
      WHERE p.id = ?
    `).get(req.params.id)

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    res.json(proposal)
  } catch (error) {
    console.error('Error fetching proposal:', error)
    res.status(500).json({ error: 'Failed to fetch proposal' })
  }
})

// Get proposals for a project
router.get('/project/:address', (req, res) => {
  try {
    const proposals = db.prepare(`
      SELECT * FROM proposals
      WHERE contract_address = ?
      ORDER BY created_at DESC
    `).all(req.params.address)

    res.json(proposals)
  } catch (error) {
    console.error('Error fetching project proposals:', error)
    res.status(500).json({ error: 'Failed to fetch proposals' })
  }
})

// Create/update proposal (called by indexer)
router.post('/', (req, res) => {
  try {
    const {
      proposalId,
      contractAddress,
      stageIndex,
      evidenceHash,
      proposer,
      votingDeadline
    } = req.body

    if (!proposalId || !contractAddress || stageIndex === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = db.prepare(`
      INSERT INTO proposals (
        proposal_id,
        contract_address,
        stage_index,
        evidence_hash,
        proposer,
        voting_deadline
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(contract_address, proposal_id) DO UPDATE SET
        evidence_hash = excluded.evidence_hash,
        voting_deadline = excluded.voting_deadline,
        updated_at = strftime('%s', 'now')
    `).run(
      parseInt(proposalId),
      contractAddress,
      parseInt(stageIndex),
      evidenceHash || '',
      proposer.toLowerCase(),
      parseInt(votingDeadline)
    )

    const proposal = db.prepare(`
      SELECT * FROM proposals
      WHERE contract_address = ? AND proposal_id = ?
    `).get(contractAddress, proposalId)

    res.status(201).json(proposal)
  } catch (error) {
    console.error('Error creating proposal:', error)
    res.status(500).json({ error: 'Failed to create proposal' })
  }
})

// Update proposal votes (called by indexer)
router.patch('/:id', (req, res) => {
  try {
    const { votesFor, votesAgainst, executed, passed } = req.body
    const updates = []
    const values = []

    if (votesFor !== undefined) {
      updates.push('votes_for = ?')
      values.push(votesFor.toString())
    }
    if (votesAgainst !== undefined) {
      updates.push('votes_against = ?')
      values.push(votesAgainst.toString())
    }
    if (executed !== undefined) {
      updates.push('executed = ?')
      values.push(executed ? 1 : 0)
    }
    if (passed !== undefined) {
      updates.push('passed = ?')
      values.push(passed ? 1 : 0)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    updates.push('updated_at = strftime("%s", "now")')
    values.push(req.params.id)

    const sql = `UPDATE proposals SET ${updates.join(', ')} WHERE id = ?`
    const result = db.prepare(sql).run(...values)

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Proposal not found' })
    }

    const proposal = db.prepare(`
      SELECT * FROM proposals WHERE id = ?
    `).get(req.params.id)

    res.json(proposal)
  } catch (error) {
    console.error('Error updating proposal:', error)
    res.status(500).json({ error: 'Failed to update proposal' })
  }
})

export default router
