import { isVip } from './economy.js'

/**
 * Add a footer to the bot response if the sender is not an owner or VIP.
 * @param {string} text The message content
 * @param {string} sender The sender JID
 * @returns {string} The message with or without footer
 */
export function addFooter(text, sender) {
  const isOwner = global.owner.some(entry => {
    const jid = Array.isArray(entry) ? entry[0] : entry
    return jid.split('@')[0] === sender.split('@')[0]
  })

  const vip = isVip(sender)

  if (isOwner || vip) {
    return text
  }

  const footer = '\n╰──────────────────'
  if (text.endsWith('╰──────────────────')) {
    return text
  }
  
  return text + footer
}
