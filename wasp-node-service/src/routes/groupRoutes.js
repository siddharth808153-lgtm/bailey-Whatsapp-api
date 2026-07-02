import express from 'express'
import * as ctrl from '../controllers/groupController.js'
const router = express.Router()

router.get('/:session_id/list', ctrl.getGroups)
router.get('/:session_id/:group_id/participants', ctrl.getParticipants)
router.post('/create', ctrl.createGroup)
router.post('/participants/update', ctrl.updateParticipants)
router.get('/:session_id/:group_id/invite-code', ctrl.getInviteCode)
router.post('/invite-code/revoke', ctrl.revokeInviteCode)
router.post('/setting', ctrl.updateSetting)
router.post('/leave', ctrl.leaveGroup)

export default router
