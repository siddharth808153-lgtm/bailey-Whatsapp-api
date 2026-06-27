import axios from 'axios'
import config from '../config.js'
import { logger } from '../utils/logger.js'

const http = axios.create({
  baseURL: config.laravelUrl + '/api/internal',
  timeout: 10000,
  headers: {
    'X-Service-Secret': config.serviceSecret,
    'Content-Type': 'application/json'
  }
})

export const LaravelCallback = {

  /**
   * Update instance status in Laravel DB
   */
  async updateInstanceStatus(sessionId, status, phoneNumber = null) {
    try {
      await http.post('/instance/status', {
        session_id: sessionId,
        status,
        phone_number: phoneNumber
      })
    } catch (err) {
      logger.error(`Failed to update instance status: ${err.message}`)
    }
  },

  /**
   * Log a sent message to Laravel message_logs table
   */
  async logMessage(data) {
    try {
      await http.post('/message/log', data)
    } catch (err) {
      logger.error(`Failed to log message: ${err.message}`)
    }
  },

  /**
   * Update campaign message status (delivered, failed)
   */
  async updateCampaignMessage(campaignMessageId, status, error = null) {
    try {
      await http.post('/campaign/message-status', {
        campaign_message_id: campaignMessageId,
        status,
        error_message: error
      })
    } catch (err) {
      logger.error(`Failed to update campaign message: ${err.message}`)
    }
  },

  /**
   * Send incoming message to Laravel for chatbot processing
   */
  async handleIncomingMessage(sessionId, message) {
    try {
      const response = await http.post('/chatbot/incoming', {
        session_id: sessionId,
        from: message.from,
        message_type: message.type,
        body: message.body,
        timestamp: message.timestamp
      })
      return response.data
    } catch (err) {
      logger.error(`Failed to handle incoming message: ${err.message}`)
      return null
    }
  },

  /**
   * Update warmup session progress
   */
  async updateWarmupProgress(sessionId, partnerId, sentCount) {
    try {
      await http.post('/warmup/progress', {
        session_id: sessionId,
        partner_session_id: partnerId,
        sent_count: sentCount
      })
    } catch (err) {
      logger.error(`Failed to update warmup progress: ${err.message}`)
    }
  },

  /**
   * Report instance banned/error to Laravel
   */
  async reportInstanceBanned(sessionId) {
    try {
      await http.post('/instance/banned', { session_id: sessionId })
    } catch (err) {
      logger.error(`Failed to report banned instance: ${err.message}`)
    }
  }
}
