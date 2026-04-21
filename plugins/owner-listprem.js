/**
 * قائمة المميزين مع تاريخ الانتهاء
 */
const DAY  = 24 * 60 * 60 * 1000
const YEAR = 365 * DAY

function remaining(ts) {
  if (!ts || ts <= 0) return '❓ غير محدد'
  const diff = ts - Date.now()
  if (diff <= 0) return '⚠️ منتهي'
  if (diff >= YEAR * 5) return '♾️ دائم'
  const days = Math.ceil(diff / DAY)
  if (days >= 365) return `${Math.floor(days/365)}س ${Math.floor((days%365)/30)}ش`
  if (days >= 30)  return `${Math.floor(days/30)} شهر`
  return `${days} يوم`
}

function formatDate(ts) {
  if (!ts || ts <= 0) return '—'
  if (ts - Date.now() >= YEAR * 5) return '♾️'
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

let handler = async (m, { conn }) => {
  const prems = (global.prems || []).map(v => v.replace(/[^0-9]/g, '')).filter(Boolean)

  if (!prems.length) {
    return m.reply('📋 لا يوجد مستخدمون مميزون حالياً.')
  }

  const getName = async jid => {
    try {
      const n = conn.getName(jid)
      if (n && n !== 'undefined') return n
    } catch {}
    return null
  }

  const now = Date.now()
  const rows = []

  for (const num of prems) {
    const jid = `${num}@s.whatsapp.net`
    const u   = global.db.data.users?.[jid] || {}
    const name = (await getName(jid)) || `+${num}`
    const exp  = u.premiumTime || 0
    const status = exp > 0 && exp < now ? '⚠️ منتهي' : '✅'
    rows.push({ num, name, jid, exp, status })
  }

  // فرز: نشطون أولاً، ثم دائمون، ثم منتهيون
  rows.sort((a, b) => {
    const aActive = a.exp > now
    const bActive = b.exp > now
    if (aActive && !bActive) return -1
    if (!aActive && bActive) return  1
    return b.exp - a.exp
  })

  let txt = `👑 *قائمة المميزين (${rows.length})*\n${'─'.repeat(28)}\n\n`
  const mentions = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    mentions.push(r.jid)
    txt += `${i + 1}. ${r.status} @${r.num}\n`
    txt += `   👤 ${r.name}\n`
    txt += `   📅 ${formatDate(r.exp)}  ⏳ ${remaining(r.exp)}\n\n`
  }

  txt += `${'─'.repeat(28)}\n`
  txt += `💡 لحذف: .حذف_بريم @الشخص\n`
  txt += `💡 للتجديد: .تجديد_بريم @الشخص [مدة]`

  await conn.sendMessage(m.chat, { text: txt.trim(), mentions }, { quoted: m })
}

handler.help = ['المميزين', 'listprem']
handler.tags = ['owner']
handler.command = /^(listprem|المميزين|البريميوم|قائمة_المميزين)$/i
handler.rowner = true

export default handler
