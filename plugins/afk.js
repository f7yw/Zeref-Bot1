import { isVip } from '../lib/economy.js'
let handler = async (m, { conn, text }) => {
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  global.db.data.users[m.sender] ||= {}
  let user = global.db.data.users[m.sender]

  user.afk = Date.now()
  user.afkReason = text || ''

  await m.reply(
    `*[❗معلومة❗] المستخدم ${conn.getName(m.sender)} سيكون غير نشط (AFK), من فضلك لا تمنشن*\n\n*—◉ سبب الاختفاء (AFK): ${text || 'بدون سبب'}*`
  )
}

handler.help = ['afk [alasan]']
handler.tags = ['main']
handler.command = /^(اختفاء|الاختفاء|افك|afk)$/i

export default handler