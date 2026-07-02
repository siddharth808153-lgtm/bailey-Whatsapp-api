import { WarmupService } from '../services/WarmupService.js'
import { logger } from '../utils/logger.js'

export async function startWarmup(req, res) {
  try {
    const { 
      session_id, partner_session_id, 
      target_count, warmup_session_id 
    } = req.body

    if (!session_id || !partner_session_id || !target_count) {
      return res.status(400).json({
        success: false,
        message: 'session_id, partner_session_id, target_count required'
      })
    }

    // Respond immediately — warmup runs in background
    res.json({
      success: true,
      message: `Warmup started. Sending ${target_count} messages.`,
      data: { warmup_session_id, target_count }
    })

    // Run warmup in background
    WarmupService.startWarmup({
      sessionId: session_id,
      partnerSessionId: partner_session_id,
      targetCount: target_count,
      warmupSessionId: warmup_session_id
    }).catch(err => {
      logger.error('Warmup error:', err)
    })

  } catch (err) {
    logger.error('Start warmup error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function stopWarmup(req, res) {
  try {
    const { warmup_session_id } = req.body
    WarmupService.stopWarmup(warmup_session_id)
    res.json({ success: true, message: 'Warmup stopped' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function getActiveWarmups(req, res) {
  try {
    const warmups = WarmupService.getActiveWarmups()
    res.json({ success: true, data: warmups })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
