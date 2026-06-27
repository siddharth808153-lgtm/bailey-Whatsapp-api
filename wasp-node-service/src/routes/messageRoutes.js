import express from 'express'
import * as ctrl from '../controllers/messageController.js'
const router = express.Router()
router.post('/send', ctrl.sendSingle)
router.post('/send-bulk', ctrl.sendBulk)
router.post('/send-group', ctrl.sendGroup)
export default router
