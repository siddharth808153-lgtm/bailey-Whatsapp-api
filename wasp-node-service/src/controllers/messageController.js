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

// Map to track active campaigns for pause/cancel
const activeCampaigns = new Map()

export async function sendCampaignBulk(req, res) {
  try {
    const { 
      session_id, campaign_id, messages, 
      min_delay = 3000, max_delay = 15000 
    } = req.body

    if (!session_id || !messages?.length) {
      return res.status(400).json({
        success: false, message: 'session_id and messages required'
      })
    }

    // Respond immediately
    res.json({
      success: true,
      message: `Campaign ${campaign_id}: queuing ${messages.length} messages`,
      data: { campaign_id, total: messages.length }
    })

    // Store campaign state for pause/cancel support
    activeCampaigns.set(campaign_id, {
      session_id, status: 'running', 
      total: messages.length, sent: 0
    })

    const log = logger.child({ session: session_id, campaign: campaign_id })
    const { LaravelCallback } = await import('../services/LaravelCallback.js')

    // Process with delays in background
    ;(async () => {
      try {
        for (let i = 0; i < messages.length; i++) {
          // Check if campaign was paused/cancelled
          let state = activeCampaigns.get(campaign_id)
          if (!state || state.status === 'cancelled') {
            log.info(`Campaign ${campaign_id} cancelled or removed`)
            break
          }
          
          // Wait if paused
          while (state?.status === 'paused') {
            await new Promise(r => setTimeout(r, 1000))
            state = activeCampaigns.get(campaign_id)
            if (!state || state.status === 'cancelled') break
          }

          if (!state || state.status === 'cancelled') {
            break
          }

          const msg = messages[i]
          
          try {
            await BaileysManager.sendMessage(
              session_id, msg.phone, msg.type || 'text', {
                ...msg,
                source_type: 'campaign',
                source_id: campaign_id
              }
            )

            // Update status in Laravel
            await LaravelCallback.updateCampaignMessage(
              msg.campaign_message_id, 'sent', null
            )

            // Update local state
            const current = activeCampaigns.get(campaign_id)
            if (current) {
              activeCampaigns.set(campaign_id, {
                ...current, sent: current.sent + 1
              })
            }

          } catch (err) {
            log.error(`Campaign message failed for ${msg.phone}: ${err.message}`)
            await LaravelCallback.updateCampaignMessage(
              msg.campaign_message_id, 'failed', err.message
            )
          }

          // Random delay between messages
          if (i < messages.length - 1) {
            const delay = Math.floor(
              Math.random() * (max_delay - min_delay + 1)
            ) + min_delay
            await new Promise(r => setTimeout(r, delay))
          }
        }
      } catch (err) {
        log.error('Campaign background send loop crashed:', err)
      } finally {
        activeCampaigns.delete(campaign_id)
        log.info(`Campaign ${campaign_id} loop exited`)
      }
    })()

  } catch (err) {
    logger.error('sendCampaignBulk error:', err)
  }
}

export async function pauseCampaign(req, res) {
  const { campaign_id } = req.body
  const state = activeCampaigns.get(campaign_id)
  if (state) {
    activeCampaigns.set(campaign_id, { ...state, status: 'paused' })
  }
  res.json({ success: true, message: 'Campaign paused' })
}

export async function cancelCampaign(req, res) {
  const { campaign_id } = req.body
  const state = activeCampaigns.get(campaign_id)
  if (state) {
    activeCampaigns.set(campaign_id, { ...state, status: 'cancelled' })
  }
  res.json({ success: true, message: 'Campaign cancelled' })
}

export async function sendPresence(req, res) {
  try {
    const { session_id, phone, presence } = req.body
    if (!session_id || !phone || !presence) {
      return res.status(400).json({
        success: false,
        message: 'session_id, phone, and presence (composing|recording|paused) are required'
      })
    }
    const { toJID } = await import('../utils/phoneFormatter.js')
    const jid = toJID(phone)
    const result = await BaileysManager.sendPresenceUpdate(session_id, jid, presence)
    res.json(result)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
