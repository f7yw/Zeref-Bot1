import { xpRange } from '../lib/levelling.js'
import { syncEnergy, initEconomy, getRole, isVip, fmt, fmtEnergy } from '../lib/economy.js'
import { typingDelay } from '../lib/presence.js'

function clockString(ms) {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function normalizeChoice(text = '') {
  const map = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  }
  return text.trim().replace(/[٠-٩۰-۹]/g, d => map[d] || d).trim()
}

const sections = {
  1: {
    title: '🎁 الخدمات المجانية',
    commands: ['نصيحه', 'ترجم', 'بروفايل', 'اذكار', 'قران', 'التوقيت', 'بلاغ', 'تسجيل']
  },
  2: {
    title: '🎮 الألعاب والترفيه',
    commands: ['شطرنج', 'اكس', 'اربعة', 'سؤال_وجواب', 'تحدي', 'سوال', 'فزوره', 'علم', 'نرد', 'حجر', 'لو', 'رهان']
  },
  3: {
    title: '💼 الاقتصاد والمتجر',
    commands: ['البنك', 'طاقة', 'معاملاتي', 'تقرير_المال', 'ايداع', 'سحب', 'تحويل', 'شراء_الماس', 'شراء_عملات', 'لفل']
  },
  4: {
    title: '🤖 الذكاء الاصطناعي',
    commands: ['ai', 'بوت', 'جوده', 'شخصية']
  },
  5: {
    title: '🎧 الوسائط والتحميل',
    commands: ['بحث_يوتيوب', 'بنترست', 'ملصق', 'صوره', 'تحميل_صوت', 'تحميل_فيديو']
  },
  6: {
    title: '👥 إدارة المجموعات',
    commands: ['طرد', 'اضف', 'رفع', 'قفل_القروب', 'منشن_ظاهر', 'الحماية']
  },
  7: {
    title: '👑 أوامر المالك',
    commands: ['addprem', 'فك-الحظر', 'بلوك', 'إعادة', 'نسخة_احتياطية']
  }
}

function buildStats(m, user, level, role, max, uptime, vipStatus) {
  const name = user.name || m.pushName || 'مستخدم'
  return `╭────『 🤖 ZEREF BOT 』────
│
│ 👤 *المستخدم:* ${name}
│ 🏆 *المستوى:* ${level} (${role})
│ ⭐ *الخبرة:* ${user.exp || 0} / ${max}
│ 💰 *المحفظة:* ${fmt(user.money)}
│ 🏦 *البنك:* ${fmt(user.bank)}
│ 💎 *الماس:* ${user.diamond || 0}
│ ⚡ *الطاقة:* ${fmtEnergy(user, m.sender)}
│ 💎 *العضوية:* ${vipStatus}
│ 🕒 *النشاط:* ${uptime}
│
╰──────────────────`.trim()
}

function buildMenuText(stats) {
  let text = `${stats}\n\n*قائمة الأوامر — اختر رقماً لعرض الفئة:*\n\n`
  for (const [key, section] of Object.entries(sections)) {
    text += `${key}. ${section.title}\n`
  }
  text += `\n💡 أرسل رقم القسم للتفاصيل`
  return text.trim()
}

function buildSection(id, stats, vipStatus) {
  const section = sections[id]
  if (!section) return null
  let text = `${stats}\n\n╭────『 ${section.title} 』────\n│\n`
  for (const cmd of section.commands) {
    text += `│ • ${cmd}\n`
  }
  text += `│\n╰──────────────────\n\n👤 العضوية: ${vipStatus}`
  return text.trim()
}

let handler = async (m, { conn, usedPrefix }) => {
  const user = global.db.data.users[m.sender] || {}
  initEconomy(user, m.sender)
  syncEnergy(user, m.sender)
  
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  const level = user.level || 0
  const role = getRole(level)
  const { max } = xpRange(level, global.multiplier)
  const uptime = clockString(process.uptime() * 1000)
  
  const stats = buildStats(m, user, level, role, max, uptime, vipStatus)
  const menu = buildMenuText(stats)
  
  global.menuSessions ??= {}
  global.menuSessions[m.sender] = { ts: Date.now() }

  const pp = await conn.profilePictureUrl(m.sender, 'image').catch(() => './src/avatar_contact.png')
  await conn.sendMessage(m.chat, { image: { url: pp }, caption: menu + `\n\n👤 العضوية: ${vipStatus}` }, { quoted: m })
}

handler.all = async function (m) {
  const session = global.menuSessions?.[m.sender]
  if (!session) return

  const raw = (m.text || '').trim()
  if (!raw || /^[./#!]/.test(raw)) return 
  
  const choice = normalizeChoice(raw)
  if (!sections[choice]) return

  if (Date.now() - session.ts > 5 * 60 * 1000) {
    delete global.menuSessions[m.sender]
    return
  }

  const user = global.db.data.users[m.sender] || {}
  initEconomy(user, m.sender)
  syncEnergy(user, m.sender)
  
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  const level = user.level || 0
  const role = getRole(level)
  const { max } = xpRange(level, global.multiplier)
  const uptime = clockString(process.uptime() * 1000)
  const stats = buildStats(m, user, level, role, max, uptime, vipStatus)

  const sectionText = buildSection(choice, stats, vipStatus)
  if (sectionText) {
    await this.reply(m.chat, sectionText, m)
    delete global.menuSessions[m.sender]
  }
}

handler.help = ['menu', 'الاوامر']
handler.tags = ['main']
handler.command = /^(menu|الاوامر|أوامر|اوامر|قائمة|قائمه|help)$/i

export default handler
