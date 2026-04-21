import { isVip } from '../lib/economy.js'
let handler = async (m, { conn, command, text }) => {
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
let intelligence = `*💡 نسبة الذكاء 💡*
*نسبة ذكاء ${text} 💡هي* *${Math.floor(Math.random() * 100)}%* *من 100%*
*ربنا يهديكم💙☁️*
`.trim()
m.reply(intelligence, null, { mentions: conn.parseMention(intelligence) })}
handler.help = ['intelligence']
handler.tags = ['fun']
handler.command = /^(ذكاء)$/i
export default handler
