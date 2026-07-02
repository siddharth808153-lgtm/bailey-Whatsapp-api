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

export async function createGroup(req, res) {
  try {
    const { session_id, title, participants } = req.body
    if (!session_id || !title || !participants?.length) {
      return res.status(400).json({
        success: false,
        message: 'session_id, title, and participants are required'
      })
    }
    const result = await BaileysManager.createGroup(session_id, title, participants)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function updateParticipants(req, res) {
  try {
    const { session_id, group_id, participants, action } = req.body
    if (!session_id || !group_id || !participants?.length || !action) {
      return res.status(400).json({
        success: false,
        message: 'session_id, group_id, participants, and action (add|remove|promote|demote) are required'
      })
    }
    const result = await BaileysManager.updateGroupParticipants(
      session_id, group_id, participants, action
    )
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function getInviteCode(req, res) {
  try {
    const { session_id, group_id } = req.params
    const result = await BaileysManager.getGroupInviteCode(session_id, group_id)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function revokeInviteCode(req, res) {
  try {
    const { session_id, group_id } = req.body
    if (!session_id || !group_id) {
      return res.status(400).json({
        success: false,
        message: 'session_id and group_id are required'
      })
    }
    const result = await BaileysManager.revokeGroupInvite(session_id, group_id)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function updateSetting(req, res) {
  try {
    const { session_id, group_id, setting } = req.body
    if (!session_id || !group_id || !setting) {
      return res.status(400).json({
        success: false,
        message: 'session_id, group_id, and setting (announcement|not_announcement|locked|unlocked) are required'
      })
    }
    const result = await BaileysManager.updateGroupSetting(session_id, group_id, setting)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function leaveGroup(req, res) {
  try {
    const { session_id, group_id } = req.body
    if (!session_id || !group_id) {
      return res.status(400).json({
        success: false,
        message: 'session_id and group_id are required'
      })
    }
    const result = await BaileysManager.leaveGroup(session_id, group_id)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
