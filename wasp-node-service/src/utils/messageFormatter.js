import { toJID, toGroupJID } from './phoneFormatter.js'

/**
 * Build Baileys message content from type + data
 * Converts legacy buttons and lists to modern Interactive Native Flow format.
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

    case 'sticker':
      return {
        sticker: { url: data.media_url }
      }

    case 'buttons':
      // Modern interactive native flow buttons
      return {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              body: { text: applyPersonalization(data.body, data.variables || {}) },
              footer: { text: data.footer || '' },
              header: data.title ? { title: data.title, hasMediaAttachment: false } : undefined,
              nativeFlowMessage: {
                buttons: (data.buttons || []).map((btn) => {
                  if (btn.type === 'url') {
                    return {
                      name: "cta_url",
                      buttonParamsJson: JSON.stringify({
                        display_text: btn.text,
                        url: btn.url,
                        merchant_url: btn.url
                      })
                    }
                  } else if (btn.type === 'call') {
                    return {
                      name: "cta_call",
                      buttonParamsJson: JSON.stringify({
                        display_text: btn.text,
                        phone_number: btn.phone
                      })
                    }
                  } else {
                    return {
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({
                        display_text: btn.text,
                        id: btn.id || btn.buttonId || `btn_${Math.random().toString(36).substr(2, 9)}`
                      })
                    }
                  }
                })
              }
            }
          }
        }
      }

    case 'list':
      // Modern interactive single select list
      return {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              body: { text: applyPersonalization(data.body, data.variables || {}) },
              footer: { text: data.footer || '' },
              header: data.title ? { title: data.title, hasMediaAttachment: false } : undefined,
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                      title: data.button_text || "Select Option",
                      sections: (data.sections || []).map(sec => ({
                        title: sec.title || "",
                        rows: (sec.rows || []).map(row => ({
                          title: row.title,
                          id: row.id || row.rowId || `row_${Math.random().toString(36).substr(2, 9)}`,
                          description: row.description || ""
                        }))
                      }))
                    })
                  }
                ]
              }
            }
          }
        }
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
