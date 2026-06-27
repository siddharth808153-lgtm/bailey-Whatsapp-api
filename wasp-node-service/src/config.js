import dotenv from 'dotenv'
dotenv.config()

export default {
  port: process.env.PORT || 3001,
  serviceSecret: process.env.SERVICE_SECRET || 'wasp_secret',
  laravelUrl: process.env.LARAVEL_URL || 'http://localhost:8000',
  sessionDir: process.env.SESSION_DIR || './sessions',
  mediaDir: process.env.MEDIA_DIR || './media',
  maxInstances: parseInt(process.env.MAX_INSTANCES || '500'),
  reconnectDelay: parseInt(process.env.RECONNECT_DELAY || '3000'),
  maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT || '5'),
  messageDelayMin: parseInt(process.env.MSG_DELAY_MIN || '3000'),
  messageDelayMax: parseInt(process.env.MSG_DELAY_MAX || '15000'),
  warmupMessages: process.env.WARMUP_MESSAGES || './src/utils/warmupMessages.js',
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'development'
}
