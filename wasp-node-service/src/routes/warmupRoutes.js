import express from 'express'
import { startWarmup, stopWarmup, getActiveWarmups } from '../controllers/warmupController.js'

const router = express.Router()
router.post('/start', startWarmup)
router.post('/stop', stopWarmup)
router.get('/active', getActiveWarmups)

export default router
