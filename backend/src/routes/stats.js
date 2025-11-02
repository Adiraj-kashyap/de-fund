import express from 'express';
import { query } from '../db/database.js';

const router = express.Router();

// Get platform statistics
router.get('/', async (req, res, next) => {
  try {
    const stats = {};

    // Total projects
    const projectsResult = await query(`
      SELECT COUNT(*) as count FROM projects
    `);
    stats.total_projects = parseInt(projectsResult.rows[0].count);

    // Active projects
    const activeResult = await query(`
      SELECT COUNT(*) as count FROM projects WHERE status = 'active'
    `);
    stats.active_projects = parseInt(activeResult.rows[0].count);

    // Total funded amount
    const fundedResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total FROM donations
    `);
    stats.total_funded = fundedResult.rows[0].total;

    // Total users
    const usersResult = await query(`
      SELECT COUNT(*) as count FROM users
    `);
    stats.total_users = parseInt(usersResult.rows[0].count);

    // Total donations
    const donationsResult = await query(`
      SELECT COUNT(*) as count FROM donations
    `);
    stats.total_donations = parseInt(donationsResult.rows[0].count);

    // Total proposals
    const proposalsResult = await query(`
      SELECT COUNT(*) as count FROM proposals
    `);
    stats.total_proposals = parseInt(proposalsResult.rows[0].count);

    // Total votes
    const votesResult = await query(`
      SELECT COUNT(*) as count FROM votes
    `);
    stats.total_votes = parseInt(votesResult.rows[0].count);

    // Projects by category
    const categoryResult = await query(`
      SELECT category, COUNT(*) as count
      FROM projects
      GROUP BY category
      ORDER BY count DESC
    `);
    stats.by_category = categoryResult.rows;

    // Recent projects
    const recentResult = await query(`
      SELECT id, title, category, created_at
      FROM projects
      ORDER BY created_at DESC
      LIMIT 5
    `);
    stats.recent_projects = recentResult.rows;

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// Get trending projects
router.get('/trending', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.*, u.username as owner_username,
        (SELECT COUNT(*) FROM donations WHERE project_id = p.id) as donor_count,
        (SELECT COALESCE(SUM(amount), 0) FROM donations WHERE project_id = p.id) as funds_raised
      FROM projects p
      LEFT JOIN users u ON p.owner_address = u.wallet_address
      WHERE p.status = 'active'
      ORDER BY (SELECT COUNT(*) FROM donations WHERE project_id = p.id) DESC
      LIMIT 10
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
