import express from 'express';
import { query } from '../db/database.js';

const router = express.Router();

// Get all proposals
router.get('/', async (req, res, next) => {
  try {
    const { status, project_id, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT pr.*, p.title as project_title, p.contract_address
      FROM proposals pr
      LEFT JOIN projects p ON pr.project_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND pr.status = $${paramIndex++}`;
      params.push(status);
    }

    if (project_id) {
      sql += ` AND pr.project_id = $${paramIndex++}`;
      params.push(project_id);
    }

    sql += ` ORDER BY pr.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get proposal by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const proposalResult = await query(`
      SELECT pr.*, p.title as project_title, p.contract_address,
        (SELECT COUNT(*) FROM votes WHERE proposal_id = pr.id) as vote_count
      FROM proposals pr
      LEFT JOIN projects p ON pr.project_id = p.id
      WHERE pr.id = $1
    `, [id]);

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    const proposal = proposalResult.rows[0];

    // Get votes
    const votesResult = await query(`
      SELECT v.*, u.username, u.avatar_url
      FROM votes v
      LEFT JOIN users u ON v.voter_address = u.wallet_address
      WHERE v.proposal_id = $1
      ORDER BY v.created_at DESC
    `, [id]);

    proposal.votes = votesResult.rows;

    res.json({ success: true, data: proposal });
  } catch (error) {
    next(error);
  }
});

// Create proposal
router.post('/', async (req, res, next) => {
  try {
    const {
      project_id,
      proposal_id_onchain,
      stage_index,
      evidence_hash,
      start_time,
      end_time,
    } = req.body;

    const result = await query(`
      INSERT INTO proposals (
        project_id, proposal_id_onchain, stage_index,
        evidence_hash, start_time, end_time
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [project_id, proposal_id_onchain, stage_index, evidence_hash, start_time, end_time]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Record vote
router.post('/:id/votes', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { voter_address, in_favor, weight, tx_hash, timestamp } = req.body;

    // Create user if doesn't exist
    await query(`
      INSERT INTO users (wallet_address)
      VALUES ($1)
      ON CONFLICT (wallet_address) DO NOTHING
    `, [voter_address.toLowerCase()]);

    const result = await query(`
      INSERT INTO votes (
        proposal_id, voter_address, in_favor, weight, tx_hash, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, voter_address.toLowerCase(), in_favor, weight, tx_hash, timestamp]);

    // Update proposal vote counts
    await query(`
      UPDATE proposals
      SET votes_for = votes_for + CASE WHEN $2 THEN $3 ELSE 0 END,
          votes_against = votes_against + CASE WHEN NOT $2 THEN $3 ELSE 0 END
      WHERE id = $1
    `, [id, in_favor, weight]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint
      return res.status(409).json({
        success: false,
        error: 'Vote already recorded for this user',
      });
    }
    next(error);
  }
});

export default router;
