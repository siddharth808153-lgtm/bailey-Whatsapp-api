import { BaileysManager, STATUS } from '../services/BaileysManager.js'
import { logger } from '../utils/logger.js'

export async function connect(req, res) {
  try {
    const { session_id } = req.body
    if (!session_id) {
      return res.status(400).json({
        success: false, message: 'session_id is required'
      })
    }
    const result = await BaileysManager.createInstance(session_id)
    res.json({ success: true, data: result })
  } catch (err) {
    logger.error('Connect error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function getStatus(req, res) {
  try {
    const { session_id } = req.params
    const status = BaileysManager.getStatus(session_id)
    res.json({ success: true, data: status })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function disconnect(req, res) {
  try {
    const { session_id } = req.body
    const result = await BaileysManager.disconnect(session_id)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function logout(req, res) {
  try {
    const { session_id } = req.body
    const result = await BaileysManager.logout(session_id)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function allInstances(req, res) {
  try {
    const instances = BaileysManager.getAllInstances()
    res.json({ success: true, data: instances })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function queueStats(req, res) {
  try {
    const stats = BaileysManager.getQueueStats()
    res.json({ success: true, data: stats })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
