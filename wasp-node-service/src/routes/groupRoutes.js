import express from 'express'
import * as ctrl from '../controllers/groupController.js'
const router = express.Router()
router.get('/:session_id/list', ctrl.getGroups)
router.get('/:session_id/:group_id/participants', ctrl.getParticipants)
export default router
