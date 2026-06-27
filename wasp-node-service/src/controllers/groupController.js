import { BaileysManager } from '../services/BaileysManager.js'

export async function getGroups(req, res) {
  try {
    const { session_id } = req.params
    const groups = await BaileysManager.getGroups(session_id)
    res.json({ success: true, data: groups })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function getParticipants(req, res) {
  try {
    const { session_id, group_id } = req.params
    const participants = await BaileysManager.getGroupParticipants(
      session_id, group_id
    )
    res.json({ success: true, data: participants })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
