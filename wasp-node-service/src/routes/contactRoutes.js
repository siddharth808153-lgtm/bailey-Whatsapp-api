import express from 'express'
import * as ctrl from '../controllers/contactController.js'
const router = express.Router()
router.post('/check', ctrl.checkNumber)
router.post('/check-bulk', ctrl.checkBulkNumbers)
router.post('/profile-picture', ctrl.getProfilePicture)
router.post('/profile', ctrl.getContactProfile)
export default router
