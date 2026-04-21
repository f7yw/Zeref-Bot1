import { isVip } from '../lib/economy.js'
let handler = async (m, { conn, text }) => {
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  let tagme = `https://wa.me/+${m.sender.replace(`+`)}/?text=BY+『彡ℤ𝕖𝕣𝕖𝕗』`
  let mylink = [m.sender]
  conn.reply(m.chat, tagme, m, { contextInfo: { mylink }})
}
handler.help = ['منشني']
handler.tags = ['group']
handler.command = /^رابطي$/i

handler.group = false

export default handler