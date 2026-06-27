import { BaileysManager } from '../services/BaileysManager.js'
import { isValid } from '../utils/phoneFormatter.js'
import { logger } from '../utils/logger.js'
import config from '../config.js'

/**
 * Send single message
 * Body: { session_id, phone, type, body, media_url, 
 *         media_filename, footer, buttons, variables,
 *         source_type, source_id }
 */
export async function sendSingle(req, res) {
  try {
    const { session_id, phone, type = 'text', ...data } = req.body

    if (!session_id || !phone) {
      return res.status(400).json({
        success: false,
        message: 'session_id and phone are required'
      })
    }

    if (!isValid(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number'
      })
    }

    const result = await BaileysManager.sendMessage(
      session_id, phone, type, data
    )
    res.json({ success: true, data: result })

  } catch (err) {
    logger.error('Send single error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

/**
 * Send bulk messages with delay
 * Body: { session_id, messages: [{ phone, type, body, ...data,
 *           campaign_message_id, variables }] }
 * Responds immediately — processes in background
 */
export async function sendBulk(req, res) {
  try {
    const { session_id, messages } = req.body

    if (!session_id || !messages?.length) {
      return res.status(400).json({
        success: false,
        message: 'session_id and messages array required'
      })
    }

    if (messages.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Max 1000 messages per bulk request'
      })
    }

    // Respond immediately
    res.json({
      success: true,
      message: `Processing ${messages.length} messages`,
      data: { total: messages.length, session_id }
    })

    // Process in background with delays
    processBulkInBackground(session_id, messages)

  } catch (err) {
    logger.error('Send bulk error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

async function processBulkInBackground(sessionId, messages) {
  const log = logger.child({ session: sessionId, task: 'bulk' })

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]

    try {
      if (!isValid(msg.phone)) {
        log.warn(`Skipping invalid phone: ${msg.phone}`)
        if (msg.campaign_message_id) {
          const { LaravelCallback } = await import('../services/LaravelCallback.js')
          await LaravelCallback.updateCampaignMessage(
            msg.campaign_message_id, 'skipped', 'Invalid phone number'
          )
        }
        continue
      }

      await BaileysManager.sendMessage(
        sessionId,
        msg.phone,
        msg.type || 'text',
        {
          ...msg,
          source_type: 'campaign',
          source_id: msg.campaign_id
        }
      )

      if (msg.campaign_message_id) {
        const { LaravelCallback } = await import('../services/LaravelCallback.js')
        await LaravelCallback.updateCampaignMessage(
          msg.campaign_message_id, 'sent'
        )
      }

      log.info(`Bulk ${i + 1}/${messages.length} sent to ${msg.phone}`)

      // Delay between messages
      if (i < messages.length - 1) {
        const min = config.messageDelayMin
        const max = config.messageDelayMax
        const delay = Math.floor(Math.random() * (max - min + 1)) + min
        await new Promise(r => setTimeout(r, delay))
      }

    } catch (err) {
      log.error(`Bulk message ${i + 1} failed: ${err.message}`)
      if (msg.campaign_message_id) {
        try {
          const { LaravelCallback } = await import('../services/LaravelCallback.js')
          await LaravelCallback.updateCampaignMessage(
            msg.campaign_message_id, 'failed', err.message
          )
        } catch (cbErr) {
          log.error(`Failed to update campaign message status callback: ${cbErr.message}`)
        }
      }
    }
  }

  log.info('Bulk send completed')
}

/**
 * Send message to WhatsApp group
 */
export async function sendGroup(req, res) {
  try {
    const { session_id, group_id, type = 'text', ...data } = req.body

    if (!session_id || !group_id) {
      return res.status(400).json({
        success: false,
        message: 'session_id and group_id required'
      })
    }

    const result = await BaileysManager.sendGroupMessage(
      session_id, group_id, type, data
    )
    res.json({ success: true, data: result })

  } catch (err) {
    logger.error('Send group error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
}
