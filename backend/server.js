import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDatabase } from './db/database.js'
import projectRoutes from './routes/projects.js'
import proposalRoutes from './routes/proposals.js'
import ipfsRoutes from './routes/ipfs.js'
import { errorHandler } from './middleware/errorHandler.js'
import { apiLimiter, uploadLimiter, projectCreationLimiter } from './middleware/rateLimiter.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(apiLimiter) // Apply rate limiting to all routes

// Initialize database
initDatabase()

// Routes
app.use('/api/projects', projectCreationLimiter, projectRoutes)
app.use('/api/proposals', proposalRoutes)
app.use('/api/ipfs', uploadLimiter, ipfsRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})
