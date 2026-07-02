import { BaileysManager } from '../services/BaileysManager.js'
import { isValid } from '../utils/phoneFormatter.js'

export async function checkNumber(req, res) {
  try {
    const { session_id, phone } = req.body
    if (!session_id || !phone) {
      return res.status(400).json({
        success: false, message: 'session_id and phone required'
      })
    }
    const result = await BaileysManager.checkNumber(session_id, phone)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function checkBulkNumbers(req, res) {
  try {
    const { session_id, phones } = req.body
    if (!phones?.length) {
      return res.status(400).json({
        success: false, message: 'phones array required'
      })
    }

    // Respond immediately
    res.json({
      success: true,
      message: `Checking ${phones.length} numbers in background`
    })

    // Check numbers with delays
    for (const phone of phones) {
      if (!isValid(phone)) continue
      try {
        await BaileysManager.checkNumber(session_id, phone)
      } catch (err) {
        // ignore individual failures in background loop
      }
      await new Promise(r => setTimeout(r, 500))
    }

  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function getProfilePicture(req, res) {
  try {
    const { session_id, phone } = req.body
    const result = await BaileysManager.getProfilePicture(
      session_id, phone
    )
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export async function getContactProfile(req, res) {
  try {
    const { session_id, phone } = req.body
    if (!session_id || !phone) {
      return res.status(400).json({
        success: false,
        message: 'session_id and phone required'
      })
    }
    const result = await BaileysManager.getContactProfile(session_id, phone)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
