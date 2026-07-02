import { BaileysManager } from './BaileysManager.js'
import { getRandomMessage, getRandomReply, getRandomDelay } from '../utils/warmupMessages.js'
import { LaravelCallback } from './LaravelCallback.js'
import { logger } from '../utils/logger.js'

// Track active warmup sessions
const activeWarmups = new Map()

export const WarmupService = {

  /**
   * Start a warmup exchange between two instances
   */
  async startWarmup({
    sessionId,          // instance being warmed
    partnerSessionId,   // partner instance
    targetCount,        // messages to exchange today
    warmupSessionId     // DB record ID
  }) {
    const log = logger.child({ warmup: warmupSessionId })
    
    activeWarmups.set(warmupSessionId, { 
      status: 'running', sent: 0 
    })

    log.info(
      `Starting warmup: ${sessionId} ↔ ${partnerSessionId}, ` +
      `target: ${targetCount}`
    )

    let sent = 0

    try {
      for (let i = 0; i < targetCount; i++) {
        // Check if cancelled
        const state = activeWarmups.get(warmupSessionId)
        if (!state || state.status === 'cancelled') {
          log.info('Warmup cancelled by user request')
          break
        }

        // Get instance phone numbers for messaging
        const senderStatus = BaileysManager.getStatus(sessionId)
        const partnerStatus = BaileysManager.getStatus(partnerSessionId)

        if (senderStatus.status !== 'connected' || partnerStatus.status !== 'connected') {
          log.warn('One or both instances disconnected, stopping warmup')
          break
        }

        // Alternate: sender → partner, partner → sender
        const isEvenMessage = i % 2 === 0
        const fromSession = isEvenMessage ? sessionId : partnerSessionId
        const toPhone = isEvenMessage 
          ? partnerStatus.phone_number 
          : senderStatus.phone_number

        if (!toPhone) {
          log.warn('Could not get phone number, skipping step')
          continue
        }

        const message = isEvenMessage 
          ? getRandomMessage() 
          : getRandomReply()

        try {
          // Send without going through MessageQueue
          // (warmup has its own slower delay)
          await BaileysManager.sendMessage(
            fromSession, toPhone, 'text',
            { body: message, source_type: 'warmup' }
          )

          sent++

          // Update local state
          activeWarmups.set(warmupSessionId, {
            status: 'running', sent
          })

          // Log progress to Laravel every 5 messages
          if (sent % 5 === 0) {
            await LaravelCallback.updateWarmupProgress(
              sessionId, partnerSessionId, sent
            )
          }

          log.debug(`Warmup message ${sent}/${targetCount} sent`)

        } catch (err) {
          log.error(`Warmup message failed: ${err.message}`)
        }

        // Slow delay between warmup messages (30-120 seconds)
        if (i < targetCount - 1) {
          const delay = getRandomDelay(30000, 120000)
          log.debug(`Waiting ${Math.round(delay/1000)}s before next`)
          
          // Custom check for cancelled status during delay sleep
          const startSleep = Date.now()
          while (Date.now() - startSleep < delay) {
            const currentState = activeWarmups.get(warmupSessionId)
            if (!currentState || currentState.status === 'cancelled') {
              break
            }
            await new Promise(r => setTimeout(r, 1000))
          }
        }
      }

    } finally {
      // Final progress update
      await LaravelCallback.updateWarmupProgress(
        sessionId, partnerSessionId, sent
      )
      activeWarmups.delete(warmupSessionId)
      log.info(`Warmup session complete. Sent: ${sent}/${targetCount}`)
    }

    return { sent, target: targetCount }
  },

  /**
   * Stop an active warmup
   */
  stopWarmup(warmupSessionId) {
    const state = activeWarmups.get(warmupSessionId)
    if (state) {
      activeWarmups.set(warmupSessionId, {
        ...state, status: 'cancelled'
      })
    }
  },

  getActiveWarmups() {
    const result = []
    for (const [id, state] of activeWarmups.entries()) {
      result.push({ warmup_session_id: id, ...state })
    }
    return result
  }
}
