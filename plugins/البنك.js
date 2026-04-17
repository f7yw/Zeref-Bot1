import { xpRange } from '../lib/levelling.js'

let handler = async (m) => {
  const user = global.db.data.users[m.sender] || {}
  const level = user.level || 1
  const exp = user.exp || 0
  const money = user.money || 0
  const limit = user.limit || 0
  const premium = user.premium || false
  const name = m.pushName || 'مستخدم'
  const { xp, max } = xpRange(level, global.multiplier)

  const role = premium ? '💎 مميز' : level >= 20 ? '🥇 محترف' : level >= 10 ? '🥈 متقدم' : '🥉 مبتدئ'

  const str = `╭────『 💰 بنك SHADOW 』────
│
│ *👤 الاسم:* ${name}
│ *🏆 المستوى:* ${level}
│ *⭐ XP:* ${exp} / ${max}
│ *🪙 العملات:* ${money}
│ *💠 الحد اليومي:* ${limit}
│ *👑 الرتبة:* ${role}
│
╰──────────────────`.trim()

  await m.reply(str)
}

handler.help = ['بنك', 'بنكي']
handler.tags = ['economy']
handler.command = /^(البنك|بنك|بنكي|رصيدي|حسابي)$/i
export default handler
