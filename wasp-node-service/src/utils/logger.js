import pino from 'pino'
import pretty from 'pino-pretty'
import config from '../config.js'

const stream = pretty({
  colorize: true,
  translateTime: 'SYS:standard',
  ignore: 'pid,hostname'
})

export const logger = pino(
  { level: config.logLevel },
  config.nodeEnv === 'development' ? stream : undefined
)

export function instanceLogger(instanceId) {
  return logger.child({ instance: instanceId })
}
