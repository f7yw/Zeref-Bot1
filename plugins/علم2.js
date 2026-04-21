import { isVip } from '../lib/economy.js'
let handler = async (m, { conn }) => {
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
    conn.tebakbendera = conn.tebakbendera ? conn.tebakbendera : {}
    let id = m.chat
    if (!(id in conn.tebakbendera)) throw false
    let json = conn.tebakbendera[id][1]
    conn.reply(m.chat, '```' + json.name.replace(/[AIUEOaiueo]/ig, '_') + '```', m)
}
handler.command = /جاوب$/i
handler.rowner = true
export default handler;