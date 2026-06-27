import PQueue from 'p-queue'
import { logger } from '../utils/logger.js'
import config from '../config.js'

// Map of instanceId → PQueue
const queues = new Map()

export const MessageQueue = {

  /**
   * Get or create queue for an instance
   * concurrency: 1 = one message at a time per instance
   */
  getQueue(instanceId) {
    if (!queues.has(instanceId)) {
      queues.set(instanceId, new PQueue({ 
        concurrency: 1,
        interval: 1000,
        intervalCap: 1
      }))
    }
    return queues.get(instanceId)
  },

  /**
   * Add a message send task to instance queue
   */
  async enqueue(instanceId, sendFn, priority = 0) {
    const queue = this.getQueue(instanceId)
    return queue.add(async () => {
      const result = await sendFn()
      await this.delay(instanceId)
      return result
    }, { priority })
  },

  /**
   * Add delay between messages (anti-ban)
   */
  async delay(instanceId) {
    const min = config.messageDelayMin
    const max = config.messageDelayMax
    // Randomize delay ±20% for human-like pattern
    const base = Math.floor(Math.random() * (max - min + 1)) + min
    const jitter = Math.floor(base * 0.2 * (Math.random() - 0.5))
    const delay = base + jitter
    
    logger.debug(`Instance ${instanceId}: waiting ${delay}ms`)
    return new Promise(resolve => setTimeout(resolve, delay))
  },

  /**
   * Get queue stats for an instance
   */
  getStats(instanceId) {
    const queue = queues.get(instanceId)
    if (!queue) return { size: 0, pending: 0, isPaused: false }
    return {
      size: queue.size,
      pending: queue.pending,
      isPaused: queue.isPaused
    }
  },

  /**
   * Pause queue (when campaign is paused)
   */
  pause(instanceId) {
    queues.get(instanceId)?.pause()
  },

  /**
   * Resume queue
   */
  resume(instanceId) {
    queues.get(instanceId)?.start()
  },

  /**
   * Clear queue (when campaign is cancelled)
   */
  clear(instanceId) {
    queues.get(instanceId)?.clear()
  },

  /**
   * Remove queue when instance disconnects
   */
  destroy(instanceId) {
    const queue = queues.get(instanceId)
    if (queue) {
      queue.clear()
      queues.delete(instanceId)
    }
  },

  getAllStats() {
    const stats = {}
    for (const [id, queue] of queues.entries()) {
      stats[id] = {
        size: queue.size,
        pending: queue.pending,
        isPaused: queue.isPaused
      }
    }
    return stats
  }
}
