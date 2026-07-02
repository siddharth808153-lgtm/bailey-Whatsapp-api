import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
  isJidGroup,
  proto,
  getContentType
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'
import QRCode from 'qrcode'
import { v4 as uuidv4 } from 'uuid'
import config from '../config.js'
import { logger, instanceLogger } from '../utils/logger.js'
import { LaravelCallback } from './LaravelCallback.js'
import { MessageQueue } from './MessageQueue.js'
import { buildMessageContent } from '../utils/messageFormatter.js'
import { toJID, stripJID } from '../utils/phoneFormatter.js'

// Instance status constants
export const STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  QR_READY: 'qr_ready',
  CONNECTED: 'connected',
  BANNED: 'banned',
  LOGGED_OUT: 'logged_out'
}

// In-memory store: sessionId → instance data
const instances = new Map()

// Reconnect attempt tracking
const reconnectAttempts = new Map()

function getSessionDir(sessionId) {
  const dir = path.join(process.cwd(), config.sessionDir, sessionId)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function clearSession(sessionId) {
  const dir = path.join(process.cwd(), config.sessionDir, sessionId)
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

export const BaileysManager = {

  /**
   * Create or reconnect a WhatsApp instance
   * sessionId: unique ID stored in whatsapp_instances.session_id
   */
  async createInstance(sessionId, options = {}) {
    const log = instanceLogger(sessionId)

    // If already connected, return
    if (instances.has(sessionId)) {
      const inst = instances.get(sessionId)
      if (inst.status === STATUS.CONNECTED) {
        return { status: STATUS.CONNECTED, message: 'Already connected' }
      }
    }

    // Set initial state
    instances.set(sessionId, {
      sessionId,
      status: STATUS.CONNECTING,
      socket: null,
      qr: null,
      qrBase64: null,
      phoneNumber: null,
      connectedAt: null,
      options
    })

    reconnectAttempts.set(sessionId, 0)

    try {
      const sessionDir = getSessionDir(sessionId)
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
      const { version } = await fetchLatestBaileysVersion()

      log.info(`Creating Baileys instance, version ${version}`)

      const sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger.child({ level: 'silent' }))
        },
        printQRInTerminal: false,
        logger: logger.child({ level: 'silent' }),
        browser: ['WASp Platform', 'Chrome', '120.0'],
        getMessage: async () => undefined,
        shouldIgnoreJid: jid => isJidBroadcast(jid),
        markOnlineOnConnect: false,  // don't show online status
        syncFullHistory: false
      })

      // ── CONNECTION UPDATES ──
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        const inst = instances.get(sessionId)
        if (!inst) return

        // QR Code generated
        if (qr) {
          log.info('QR code generated')
          let qrBase64 = null
          try {
            qrBase64 = await QRCode.toDataURL(qr)
          } catch (e) {
            log.error('QR generation failed:', e)
          }

          instances.set(sessionId, {
            ...inst,
            status: STATUS.QR_READY,
            qr,
            qrBase64
          })

          await LaravelCallback.updateInstanceStatus(
            sessionId, STATUS.QR_READY
          )
        }

        // Connection closed
        if (connection === 'close') {
          const err = lastDisconnect?.error
          const statusCode = err instanceof Boom
            ? err.output.statusCode
            : 500

          log.warn(`Connection closed. Code: ${statusCode}`)

          // Determine if banned
          if (statusCode === DisconnectReason.loggedOut) {
            log.error('Instance logged out / banned')
            instances.set(sessionId, {
              ...inst,
              status: STATUS.LOGGED_OUT,
              socket: null,
              qr: null,
              qrBase64: null
            })
            clearSession(sessionId)
            await LaravelCallback.updateInstanceStatus(
              sessionId, STATUS.LOGGED_OUT
            )
            await LaravelCallback.reportInstanceBanned(sessionId)
            MessageQueue.destroy(sessionId)
            return
          }

          // Check reconnect attempts
          const attempts = (reconnectAttempts.get(sessionId) || 0) + 1
          reconnectAttempts.set(sessionId, attempts)

          if (attempts > config.maxReconnectAttempts) {
            log.error(`Max reconnect attempts reached for ${sessionId}`)
            instances.set(sessionId, {
              ...inst,
              status: STATUS.DISCONNECTED,
              socket: null
            })
            await LaravelCallback.updateInstanceStatus(
              sessionId, STATUS.DISCONNECTED
            )
            return
          }

          // Reconnect with backoff
          const delay = config.reconnectDelay * attempts
          log.info(`Reconnecting in ${delay}ms (attempt ${attempts})`)
          instances.set(sessionId, {
            ...inst,
            status: STATUS.CONNECTING,
            socket: null
          })
          setTimeout(() => this.createInstance(sessionId, options), delay)
        }

        // Connected successfully
        if (connection === 'open') {
          log.info('Connected to WhatsApp')
          reconnectAttempts.set(sessionId, 0)

          // Get phone number from creds
          const phoneNumber = sock.user?.id
            ? stripJID(sock.user.id)
            : null

          instances.set(sessionId, {
            ...inst,
            status: STATUS.CONNECTED,
            socket: sock,
            qr: null,
            qrBase64: null,
            phoneNumber,
            connectedAt: new Date()
          })

          await LaravelCallback.updateInstanceStatus(
            sessionId, STATUS.CONNECTED, phoneNumber
          )
        }
      })

      // ── INCOMING MESSAGES ──
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return

        for (const msg of messages) {
          // Skip own messages and status updates
          if (msg.key.fromMe) continue
          if (msg.key.remoteJid === 'status@broadcast') continue

          try {
            const messageData = parseIncomingMessage(msg)
            if (!messageData) continue

            log.debug(`Incoming message from ${messageData.from}`)

            // Send to Laravel for chatbot processing
            const response = await LaravelCallback.handleIncomingMessage(
              sessionId, messageData
            )

            // If Laravel returns a reply, send it
            if (response?.data?.reply) {
              const { reply } = response.data

              if (reply.simulate_typing) {
                await this.sendWithTyping(
                  sessionId,
                  messageData.from,
                  reply.type || 'text',
                  reply,
                  reply.typing_delay_seconds || 3
                )
              } else {
                await this.sendMessage(
                  sessionId,
                  messageData.from,
                  reply.type || 'text',
                  reply
                )
              }
            }

          } catch (err) {
            log.error('Error processing incoming message:', err)
          }
        }
      })

      // ── SAVE CREDENTIALS ──
      sock.ev.on('creds.update', saveCreds)

      // Update instance with socket
      const current = instances.get(sessionId)
      instances.set(sessionId, { ...current, socket: sock })

      return { status: STATUS.CONNECTING, message: 'Connecting...' }

    } catch (err) {
      log.error('Failed to create instance:', err)
      instances.set(sessionId, {
        sessionId,
        status: STATUS.DISCONNECTED,
        socket: null,
        qr: null,
        qrBase64: null
      })
      throw err
    }
  },

  /**
   * Send a message through an instance
   */
  async sendMessage(sessionId, phone, type, data) {
    const inst = instances.get(sessionId)
    if (!inst || inst.status !== STATUS.CONNECTED) {
      throw new Error(
        `Instance ${sessionId} not connected. Status: ${inst?.status}`
      )
    }

    const jid = toJID(phone)
    const content = buildMessageContent(type, data)

    // Add to queue (enforces delay between messages)
    return MessageQueue.enqueue(sessionId, async () => {
      try {
        await inst.socket.sendMessage(jid, content)
        
        // Log to Laravel
        await LaravelCallback.logMessage({
          session_id: sessionId,
          to_phone: phone,
          message_type: type,
          message_body: data.body || null,
          status: 'sent',
          source_type: data.source_type || 'manual',
          source_id: data.source_id || null
        })

        return { success: true, phone, jid }
      } catch (err) {
        await LaravelCallback.logMessage({
          session_id: sessionId,
          to_phone: phone,
          message_type: type,
          status: 'failed',
          error_message: err.message,
          source_type: data.source_type || 'manual',
          source_id: data.source_id || null
        })
        throw err
      }
    })
  },

  /**
   * Send message to a group
   */
  async sendGroupMessage(sessionId, groupId, type, data) {
    const inst = instances.get(sessionId)
    if (!inst || inst.status !== STATUS.CONNECTED) {
      throw new Error(`Instance ${sessionId} not connected`)
    }

    const jid = groupId.includes('@g.us') 
      ? groupId 
      : groupId + '@g.us'
    const content = buildMessageContent(type, data)

    return MessageQueue.enqueue(sessionId, async () => {
      await inst.socket.sendMessage(jid, content)
      return { success: true, groupId, jid }
    })
  },

  /**
   * Get all groups this instance is in
   */
  async getGroups(sessionId) {
    const inst = instances.get(sessionId)
    if (!inst || inst.status !== STATUS.CONNECTED) {
      throw new Error(`Instance ${sessionId} not connected`)
    }

    const groups = await inst.socket.groupFetchAllParticipating()
    return Object.values(groups).map(group => ({
      id: group.id,
      subject: group.subject,
      description: group.desc || '',
      participants_count: group.participants?.length || 0,
      is_admin: group.participants?.some(
        p => p.id === inst.socket.user?.id && 
        (p.admin === 'admin' || p.admin === 'superadmin')
      ) || false,
      created_at: group.creation
    }))
  },

  /**
   * Send message with typing simulation (composing indicator)
   */
  async sendWithTyping(sessionId, phone, type, data, delaySeconds = 3) {
    const inst = instances.get(sessionId)
    if (!inst || inst.status !== STATUS.CONNECTED) {
      throw new Error(
        `Instance ${sessionId} not connected. Status: ${inst?.status}`
      )
    }

    const log = instanceLogger(sessionId)
    const jid = toJID(phone)

    return MessageQueue.enqueue(sessionId, async () => {
      try {
        // Show "composing" presence to the user
        await inst.socket.sendPresenceUpdate('composing', jid)

        // Wait for the specified delay to simulate typing
        const delay = Math.min(delaySeconds, 10) * 1000
        await new Promise(r => setTimeout(r, delay))

        // Stop composing
        await inst.socket.sendPresenceUpdate('paused', jid)

        // Build and send the message
        const content = buildMessageContent(type, data)
        await inst.socket.sendMessage(jid, content)

        log.debug(`Sent message with typing to ${phone} (delay: ${delaySeconds}s)`)

        // Log to Laravel
        await LaravelCallback.logMessage({
          session_id: sessionId,
          to_phone: phone,
          message_type: type,
          message_body: data.body || null,
          status: 'sent',
          source_type: 'chatbot',
          source_id: null
        })

        return { success: true, phone, jid, typing: true }
      } catch (err) {
        await LaravelCallback.logMessage({
          session_id: sessionId,
          to_phone: phone,
          message_type: type,
          status: 'failed',
          error_message: err.message,
          source_type: 'chatbot',
          source_id: null
        })
        throw err
      }
    })
  },

  /**
   * Get group participants
   */
  async getGroupParticipants(sessionId, groupId) {
    const inst = instances.get(sessionId)
    if (!inst || inst.status !== STATUS.CONNECTED) {
      throw new Error(`Instance ${sessionId} not connected`)
    }

    const jid = groupId.includes('@g.us') 
      ? groupId 
      : groupId + '@g.us'
    const metadata = await inst.socket.groupMetadata(jid)

    return metadata.participants.map(p => ({
      phone: stripJID(p.id),
      jid: p.id,
      is_admin: p.admin === 'admin' || p.admin === 'superadmin',
      is_super_admin: p.admin === 'superadmin'
    }))
  },

  /**
   * Check if a phone number is on WhatsApp
   */
  async checkNumber(sessionId, phone) {
    const inst = instances.get(sessionId)
    if (!inst || inst.status !== STATUS.CONNECTED) {
      throw new Error(`Instance ${sessionId} not connected`)
    }

    const jid = toJID(phone)
    try {
      const result = await inst.socket.onWhatsApp(jid)
      return {
        phone,
        exists: result?.[0]?.exists || false,
        jid: result?.[0]?.jid || null
      }
    } catch {
      return { phone, exists: false, jid: null }
    }
  },

  /**
   * Get profile picture URL of a contact
   */
  async getProfilePicture(sessionId, phone) {
    const inst = instances.get(sessionId)
    if (!inst || inst.status !== STATUS.CONNECTED) {
      throw new Error(`Instance ${sessionId} not connected`)
    }

    try {
      const url = await inst.socket.profilePictureUrl(
        toJID(phone), 'image'
      )
      return { phone, picture_url: url }
    } catch {
      return { phone, picture_url: null }
    }
  },

  /**
   * Get instance status
   */
  getStatus(sessionId) {
    const inst = instances.get(sessionId)
    if (!inst) {
      return {
        status: STATUS.DISCONNECTED,
        qr: null,
        qr_image: null,
        phone_number: null,
        message: 'Instance not found. Call /connect first.'
      }
    }
    return {
      status: inst.status,
      qr: inst.qr || null,
      qr_image: inst.qrBase64 || null,
      phone_number: inst.phoneNumber || null,
      connected_at: inst.connectedAt || null,
      queue_stats: MessageQueue.getStats(sessionId),
      message: getStatusMessage(inst.status)
    }
  },

  /**
   * Disconnect and optionally clear session
   */
  async disconnect(sessionId, clearSession_ = false) {
    const inst = instances.get(sessionId)

    if (inst?.socket) {
      try {
        await inst.socket.logout()
      } catch { /* ignore */ }
    }

    instances.set(sessionId, {
      ...inst,
      status: STATUS.DISCONNECTED,
      socket: null,
      qr: null,
      qrBase64: null
    })

    MessageQueue.destroy(sessionId)

    if (clearSession_) {
      clearSession(sessionId)
      instances.delete(sessionId)
    }

    await LaravelCallback.updateInstanceStatus(
      sessionId, STATUS.DISCONNECTED
    )

    return { success: true, message: 'Disconnected' }
  },

  /**
   * Logout completely (forces new QR next time)
   */
  async logout(sessionId) {
    await this.disconnect(sessionId, true)
    return { success: true, message: 'Logged out and session cleared' }
  },

  /**
   * Get all instances summary
   */
  getAllInstances() {
    const result = []
    for (const [id, inst] of instances.entries()) {
      result.push({
        session_id: id,
        status: inst.status,
        phone_number: inst.phoneNumber,
        has_qr: !!inst.qr,
        connected_at: inst.connectedAt,
        queue_size: MessageQueue.getStats(id).size
      })
    }
    return result
  },

  /**
   * Restore instances on service restart
   * Called on startup — reconnects all instances that have sessions
   */
  async restoreInstances() {
    const sessionBase = path.join(process.cwd(), config.sessionDir)
    if (!fs.existsSync(sessionBase)) return

    let sessionFolders = []
    try {
      sessionFolders = fs.readdirSync(sessionBase)
    } catch {
      return
    }

    logger.info(`Restoring ${sessionFolders.length} instances...`)

    for (const sessionId of sessionFolders) {
      const sessionPath = path.join(sessionBase, sessionId)
      if (!fs.statSync(sessionPath).isDirectory()) continue

      // Check if session has creds (was previously connected)
      const credsPath = path.join(sessionPath, 'creds.json')
      if (!fs.existsSync(credsPath)) continue

      logger.info(`Restoring instance: ${sessionId}`)
      try {
        await this.createInstance(sessionId)
        // Small delay between restores to avoid overwhelming WhatsApp
        await new Promise(r => setTimeout(r, 2000))
      } catch (err) {
        logger.error(`Failed to restore ${sessionId}:`, err)
      }
    }
  },

  getQueueStats() {
    return MessageQueue.getAllStats()
  }
}

// ── HELPERS ──

function getStatusMessage(status) {
  return {
    [STATUS.DISCONNECTED]: 'Not connected',
    [STATUS.CONNECTING]: 'Connecting...',
    [STATUS.QR_READY]: 'Scan QR code with WhatsApp',
    [STATUS.CONNECTED]: 'Connected and ready',
    [STATUS.BANNED]: 'Number banned by WhatsApp',
    [STATUS.LOGGED_OUT]: 'Logged out — reconnect required'
  }[status] || 'Unknown'
}

function parseIncomingMessage(msg) {
  try {
    const type = getContentType(msg.message)
    if (!type) return null

    let body = ''
    if (type === 'conversation') {
      body = msg.message.conversation
    } else if (type === 'extendedTextMessage') {
      body = msg.message.extendedTextMessage.text
    } else if (type === 'imageMessage') {
      body = msg.message.imageMessage?.caption || ''
    } else if (type === 'videoMessage') {
      body = msg.message.videoMessage?.caption || ''
    } else if (type === 'buttonsResponseMessage') {
      body = msg.message.buttonsResponseMessage?.selectedDisplayText || ''
    } else if (type === 'listResponseMessage') {
      body = msg.message.listResponseMessage?.title || ''
    } else if (type === 'interactiveResponseMessage') {
      body = msg.message.interactiveResponseMessage
        ?.nativeFlowResponseMessage?.paramsJson || ''
    }

    return {
      from: msg.key.remoteJid,
      type: mapMessageType(type),
      body,
      timestamp: msg.messageTimestamp,
      message_id: msg.key.id,
      is_group: msg.key.remoteJid?.endsWith('@g.us') || false
    }
  } catch {
    return null
  }
}

function mapMessageType(baileysType) {
  const map = {
    conversation: 'text',
    extendedTextMessage: 'text',
    imageMessage: 'image',
    videoMessage: 'video',
    documentMessage: 'document',
    audioMessage: 'audio',
    stickerMessage: 'sticker',
    locationMessage: 'location',
    contactMessage: 'contact',
    buttonsResponseMessage: 'button_reply',
    listResponseMessage: 'list_reply',
    interactiveResponseMessage: 'interactive_reply'
  }
  return map[baileysType] || 'unknown'
}
