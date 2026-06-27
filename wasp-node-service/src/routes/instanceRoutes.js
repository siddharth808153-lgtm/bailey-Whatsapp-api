import express from 'express'
import * as ctrl from '../controllers/instanceController.js'
const router = express.Router()
router.post('/connect', ctrl.connect)
router.get('/status/:session_id', ctrl.getStatus)
router.post('/disconnect', ctrl.disconnect)
router.post('/logout', ctrl.logout)
router.get('/all', ctrl.allInstances)
router.get('/queues', ctrl.queueStats)
export default router
