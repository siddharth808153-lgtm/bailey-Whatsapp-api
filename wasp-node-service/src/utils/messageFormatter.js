import { toJID, toGroupJID } from './phoneFormatter.js'

/**
 * Build Baileys message content from type + data
 */
export function buildMessageContent(type, data) {
  switch (type) {
    case 'text':
      return {
        text: applyPersonalization(data.body, data.variables || {})
      }

    case 'image':
      return {
        image: { url: data.media_url },
        caption: data.body 
          ? applyPersonalization(data.body, data.variables || {}) 
          : undefined
      }

    case 'video':
      return {
        video: { url: data.media_url },
        caption: data.body 
          ? applyPersonalization(data.body, data.variables || {}) 
          : undefined
      }

    case 'document':
      return {
        document: { url: data.media_url },
        fileName: data.media_filename || 'document',
        mimetype: data.mimetype || 'application/pdf',
        caption: data.body ? data.body : undefined
      }

    case 'audio':
      return {
        audio: { url: data.media_url },
        mimetype: 'audio/mp4',
        ptt: data.voice_note === true  // true = voice note style
      }

    case 'location':
      return {
        location: {
          degreesLatitude: data.latitude,
          degreesLongitude: data.longitude,
          name: data.location_name || '',
          address: data.address || ''
        }
      }

    case 'contact':
      return {
        contacts: {
          displayName: data.contact_name,
          contacts: [{
            vcard: buildVCard(data)
          }]
        }
      }

    case 'buttons':
      return {
        text: applyPersonalization(data.body, data.variables || {}),
        footer: data.footer || '',
        buttons: (data.buttons || []).map((btn, i) => ({
          buttonId: `btn_${i}`,
          buttonText: { displayText: btn.text },
          type: 1
        })),
        headerType: 1
      }

    case 'list':
      return {
        text: applyPersonalization(data.body, data.variables || {}),
        footer: data.footer || '',
        title: data.title || '',
        buttonText: data.button_text || 'Select Option',
        sections: data.sections || []
      }

    default:
      return { text: data.body || '' }
  }
}

/**
 * Replace {{name}}, {{phone}}, {{custom1}} etc with actual values
 */
export function applyPersonalization(text, variables) {
  if (!text) return ''
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match
  })
}

function buildVCard(data) {
  return `BEGIN:VCARD\nVERSION:3.0\nFN:${data.contact_name}\n` +
    `TEL;type=CELL;type=VOICE;waid=${data.contact_phone}:` +
    `+${data.contact_phone}\nEND:VCARD`
}
