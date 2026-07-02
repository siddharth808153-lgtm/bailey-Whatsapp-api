import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { requireSecret } from './middleware/auth.js'
import instanceRoutes from './routes/instanceRoutes.js'
import messageRoutes from './routes/messageRoutes.js'
import groupRoutes from './routes/groupRoutes.js'
import contactRoutes from './routes/contactRoutes.js'
import warmupRoutes from './routes/warmupRoutes.js'
import { logger } from './utils/logger.js'
import { BaileysManager } from './services/BaileysManager.js'
import config from './config.js'

dotenv.config()
const app = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { success: false, message: 'Rate limit exceeded' }
})
app.use(limiter)

// Health check (public)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'WASp Node Service',
    status: 'running',
    instances: BaileysManager.getAllInstances().length,
    timestamp: new Date().toISOString()
  })
})

// All routes require service secret
app.use('/api', requireSecret)
app.use('/api/instance', instanceRoutes)
app.use('/api/message', messageRoutes)
app.use('/api/group', groupRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/warmup', warmupRoutes)

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err)
  res.status(500).json({ 
    success: false, message: 'Internal server error' 
  })
})

// Start server
app.listen(config.port, async () => {
  logger.info(`WASp Node Service running on port ${config.port}`)
  logger.info(`Health: http://localhost:${config.port}/health`)

  // Restore previously connected instances on startup
  await BaileysManager.restoreInstances()
})
