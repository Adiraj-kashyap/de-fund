import express from 'express';
import { query } from '../db/database.js';

const router = express.Router();

// Get user by wallet address
router.get('/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    const userResult = await query(`
      SELECT * FROM users WHERE wallet_address = $1
    `, [address.toLowerCase()]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get user's projects
    const projectsResult = await query(`
      SELECT p.*,
        (SELECT COALESCE(SUM(amount), 0) FROM donations WHERE project_id = p.id) as funds_raised
      FROM projects p
      WHERE p.owner_address = $1
      ORDER BY p.created_at DESC
    `, [address.toLowerCase()]);

    // Get user's donations
    const donationsResult = await query(`
      SELECT d.*, p.title as project_title
      FROM donations d
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE d.donor_address = $1
      ORDER BY d.created_at DESC
    `, [address.toLowerCase()]);

    // Get user's votes
    const votesResult = await query(`
      SELECT v.*, pr.project_id
      FROM votes v
      LEFT JOIN proposals pr ON v.proposal_id = pr.id
      WHERE v.voter_address = $1
      ORDER BY v.created_at DESC
    `, [address.toLowerCase()]);

    user.projects = projectsResult.rows;
    user.donations = donationsResult.rows;
    user.votes = votesResult.rows;

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Create or update user profile
router.put('/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    const { username, email, avatar_url, bio } = req.body;

    const result = await query(`
      INSERT INTO users (wallet_address, username, email, avatar_url, bio)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (wallet_address)
      DO UPDATE SET
        username = COALESCE($2, users.username),
        email = COALESCE($3, users.email),
        avatar_url = COALESCE($4, users.avatar_url),
        bio = COALESCE($5, users.bio),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [address.toLowerCase(), username, email, avatar_url, bio]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get user statistics
router.get('/:address/stats', async (req, res, next) => {
  try {
    const { address } = req.params;

    const stats = {};

    // Total projects created
    const projectsResult = await query(`
      SELECT COUNT(*) as count FROM projects WHERE owner_address = $1
    `, [address.toLowerCase()]);
    stats.projects_created = parseInt(projectsResult.rows[0].count);

    // Total donated
    const donatedResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE donor_address = $1
    `, [address.toLowerCase()]);
    stats.total_donated = donatedResult.rows[0].total;

    // Total received (as project owner)
    const receivedResult = await query(`
      SELECT COALESCE(SUM(d.amount), 0) as total
      FROM donations d
      JOIN projects p ON d.project_id = p.id
      WHERE p.owner_address = $1
    `, [address.toLowerCase()]);
    stats.total_received = receivedResult.rows[0].total;

    // Total votes cast
    const votesResult = await query(`
      SELECT COUNT(*) as count FROM votes WHERE voter_address = $1
    `, [address.toLowerCase()]);
    stats.votes_cast = parseInt(votesResult.rows[0].count);

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

export default router;
