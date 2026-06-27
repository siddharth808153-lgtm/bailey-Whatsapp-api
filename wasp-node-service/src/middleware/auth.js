import config from '../config.js'
export function requireSecret(req, res, next) {
  const secret = req.headers['x-service-secret']
  if (!secret || secret !== config.serviceSecret) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    })
  }
  next()
}
