import { xpRange } from '../lib/levelling.js'
import { initEconomy, syncEnergy, fmt, fmtEnergy, getRole } from '../lib/economy.js'

let handler = async (m, { conn }) => {
  const who = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
  const user = global.db.data.users[who] || (global.db.data.users[who] = {})
  initEconomy(user)
  syncEnergy(user)
  const level = user.level || 0
  const { max } = xpRange(level, global.multiplier)
  let name = who.split('@')[0]
  try {
    name = await Promise.resolve(conn.getName(who))
  } catch (_) {}
  const registered = user.registered ? 'نعم' : 'لا'
  const premium = user.premium || user.premiumTime > 0 ? 'نعم' : 'لا'
  const banned = user.banned ? 'نعم' : 'لا'
  const pp = await conn.profilePictureUrl(who, 'image').catch(() => './src/avatar_contact.png')
  const regTime = user.regTime && user.regTime > 0 ? new Date(user.regTime).toLocaleString('ar') : 'غير متوفر'
  const lastSeen = user.lastseen && user.lastseen > 0 ? new Date(user.lastseen).toLocaleString('ar') : 'غير متوفر'
  const text = `
╭────『 👤 البروفايل 』────
│ الاسم: *${name}*
│ الرقم: @${who.split('@')[0]}
│ المعرف: ${who}
│ مسجل: *${registered}*
│ تاريخ التسجيل: *${regTime}*
│ مميز: *${premium}*
│ محظور: *${banned}*
│ سبب الحظر: *${user.bannedReason || 'لا يوجد'}*
│ التحذيرات: *${user.warn || 0}*
│
│ المستوى: *${level}*
│ الرتبة: *${getRole(level)}*
│ XP: *${user.exp || 0} / ${max}*
│ الحد اليومي: *${user.limit || 0}*
│ مرات الدخول: *${user.joincount || 0}*
│
│ المحفظة: *${fmt(user.money)}*
│ البنك: *${fmt(user.bank)}*
│ الماس: *${user.diamond || 0}*
│ الطاقة: ${fmtEnergy(user)}
│
│ المكتسبات: *${fmt(user.totalEarned)}*
│ المصروفات: *${fmt(user.totalSpent)}*
│ آخر ظهور محفوظ: *${lastSeen}*
╰──────────────────`.trim()
  await conn.sendMessage(m.chat, { image: { url: pp }, caption: text, mentions: [who] }, { quoted: m })
}

handler.help = ['بروفايل', 'profile']
handler.tags = ['info']
handler.command = /^(بروفايل|ملفي|حسابي|profile|perfil)$/i
export default handler