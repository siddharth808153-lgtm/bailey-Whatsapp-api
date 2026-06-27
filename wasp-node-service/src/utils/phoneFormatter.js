/**
 * Convert phone number to WhatsApp JID
 * Handles: 10-digit Indian, +91 prefix, 91 prefix
 */
export function toJID(phone) {
  let cleaned = String(phone).replace(/\D/g, '')
  if (cleaned.length === 10) cleaned = '91' + cleaned
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '91' + cleaned.slice(1)
  }
  return cleaned + '@s.whatsapp.net'
}

export function toGroupJID(groupId) {
  if (groupId.includes('@g.us')) return groupId
  return groupId + '@g.us'
}

export function isGroupJID(jid) {
  return jid.endsWith('@g.us')
}

export function stripJID(jid) {
  return jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
}

export function isValid(phone) {
  const cleaned = String(phone).replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 13
}

export function normalizePhone(phone) {
  let cleaned = String(phone).replace(/\D/g, '')
  if (cleaned.length === 10) cleaned = '91' + cleaned
  return cleaned
}
