import express from 'express'
import * as ctrl from '../controllers/messageController.js'
const router = express.Router()
router.post('/send', ctrl.sendSingle)
router.post('/send-bulk', ctrl.sendBulk)
router.post('/send-group', ctrl.sendGroup)
router.post('/send-campaign-bulk', ctrl.sendCampaignBulk)
router.post('/campaign/pause', ctrl.pauseCampaign)
router.post('/campaign/cancel', ctrl.cancelCampaign)
router.post('/presence', ctrl.sendPresence)
export default router
