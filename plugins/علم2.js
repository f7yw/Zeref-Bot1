import { isVip } from '../lib/economy.js'
let handler = async (m, { conn }) => {
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
    conn.tebakbendera = conn.tebakbendera ? conn.tebakbendera : {}
    let id = m.chat
    if (!(id in conn.tebakbendera)) throw false
    let json = conn.tebakbendera[id][1]
    conn.reply(m.chat, '```' + json.name.replace(/[AIUEOaiueo]/ig, '_') + '```', m)
}
handler.command = /جاوب$/i
handler.rowner = true
export default handler;