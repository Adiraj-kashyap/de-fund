import express from 'express'
import { getDatabase } from '../db/database.js'
import { validateProjectData, validateAddress } from '../utils/validation.js'

const router = express.Router()
const db = getDatabase()

// Get all projects
router.get('/', (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT * FROM projects
      ORDER BY created_at DESC
    `).all()

    res.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// Get project by contract address
router.get('/:address', (req, res) => {
  try {
    const project = db.prepare(`
      SELECT * FROM projects
      WHERE contract_address = ?
    `).get(req.params.address)

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// Get projects by owner
router.get('/user/:address', (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT * FROM projects
      WHERE owner = ?
      ORDER BY created_at DESC
    `).all(req.params.address.toLowerCase())

    res.json(projects)
  } catch (error) {
    console.error('Error fetching user projects:', error)
    res.status(500).json({ error: 'Failed to fetch user projects' })
  }
})

// Create new project
router.post('/', (req, res, next) => {
  try {
    const {
      title,
      description,
      owner,
      fundingGoal,
      deadline,
      totalStages,
      stageAllocations,
      contractAddress
    } = req.body

    // Validate owner address
    const addressValidation = validateAddress(owner)
    if (!addressValidation.valid) {
      return res.status(400).json({ error: addressValidation.error })
    }

    // Validate project data
    const validation = validateProjectData({
      title,
      fundingGoal,
      deadline,
      totalStages,
      stageAllocations,
    })
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', ') })
    }

    // For now, contractAddress is optional (will be set after deployment)
    const result = db.prepare(`
      INSERT INTO projects (
        contract_address,
        title,
        description,
        owner,
        funding_goal,
        deadline,
        total_stages,
        stage_allocations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contractAddress || `pending_${Date.now()}`,
      title,
      description || '',
      owner.toLowerCase(),
      fundingGoal.toString(),
      parseInt(deadline),
      parseInt(totalStages),
      JSON.stringify(stageAllocations)
    )

    const project = db.prepare(`
      SELECT * FROM projects WHERE id = ?
    `).get(result.lastInsertRowid)

    res.status(201).json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Project with this contract address already exists' })
    }
    next(error)
  }
})

// Update project (e.g., set contract address after deployment)
router.patch('/:address', (req, res) => {
  try {
    const updates = []
    const values = []

    Object.keys(req.body).forEach(key => {
      if (['title', 'description', 'contract_address'].includes(key)) {
        updates.push(`${key} = ?`)
        values.push(req.body[key])
      }
    })

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    updates.push(`updated_at = strftime('%s', 'now')`)
    values.push(req.params.address)

    const sql = `UPDATE projects SET ${updates.join(', ')} WHERE contract_address = ?`
    const result = db.prepare(sql).run(...values)

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const project = db.prepare(`
      SELECT * FROM projects WHERE contract_address = ?
    `).get(req.params.address)

    res.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

export default router
