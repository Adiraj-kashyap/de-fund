import express from 'express';
import { query } from '../db/database.js';

const router = express.Router();

// Get all projects
router.get('/', async (req, res, next) => {
  try {
    const { status, category, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT p.*, u.username as owner_username,
        (SELECT COUNT(*) FROM donations WHERE project_id = p.id) as donor_count,
        (SELECT COALESCE(SUM(amount), 0) FROM donations WHERE project_id = p.id) as funds_raised
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

    sql += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
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
      SELECT p.*, u.username as owner_username, u.avatar_url as owner_avatar,
        (SELECT COUNT(*) FROM donations WHERE project_id = p.id) as donor_count,
        (SELECT COALESCE(SUM(amount), 0) FROM donations WHERE project_id = p.id) as funds_raised
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
    `, [id]);

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
        (SELECT COALESCE(SUM(amount), 0) FROM donations WHERE project_id = p.id) as funds_raised
      FROM projects p
      LEFT JOIN users u ON p.owner_address = u.wallet_address
      WHERE p.contract_address = $1
    `, [address.toLowerCase()]);

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

// Create new project
router.post('/', async (req, res, next) => {
  try {
    const {
      contract_address,
      owner_address,
      title,
      description,
      category,
      image_url,
      funding_goal,
      funding_deadline,
      total_stages,
      milestones,
    } = req.body;

    // Validate required fields
    if (!contract_address || !owner_address || !title || !description || !funding_goal) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Create user if doesn't exist
    await query(`
      INSERT INTO users (wallet_address)
      VALUES ($1)
      ON CONFLICT (wallet_address) DO NOTHING
    `, [owner_address.toLowerCase()]);

    // Insert project
    const projectResult = await query(`
      INSERT INTO projects (
        contract_address, owner_address, title, description,
        category, image_url, funding_goal, funding_deadline, total_stages
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      contract_address.toLowerCase(),
      owner_address.toLowerCase(),
      title,
      description,
      category || 'other',
      image_url,
      funding_goal,
      funding_deadline,
      total_stages,
    ]);

    const project = projectResult.rows[0];

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
    if (error.code === '23505') { // Unique constraint violation
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
      SELECT d.*, u.username, u.avatar_url
      FROM donations d
      LEFT JOIN users u ON d.donor_address = u.wallet_address
      WHERE d.project_id = $1
      ORDER BY d.created_at DESC
    `, [id]);

    res.json({ success: true, data: result.rows });
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

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Add project update
router.post('/:id/updates', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const result = await query(`
      INSERT INTO project_updates (project_id, title, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, title, content]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
