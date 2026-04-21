import { isVip } from '../lib/economy.js'
let handler = async (m, { conn, command, text }) => {
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
let beauty = `▣──────────────────
│
*▣─❧ نسبة الجمال*
  *نسبة جمال ${text}*
*${Math.floor(Math.random() * 100)}%* *من 100%*
│
▣──────────────────
`.trim()
m.reply(beauty, null, { mentions: conn.parseMention(beauty) })}
handler.help = ['beauty']
handler.tags = ['fun']
handler.command = /^(جمال)$/i
export default handler
