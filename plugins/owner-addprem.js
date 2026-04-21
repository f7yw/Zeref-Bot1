/**
 * إضافة / تجديد / حذف VIP مع دعم المدة
 *
 * أمثلة:
 *   .بريم @user 30         → 30 يوم
 *   .بريم @user 1 شهر      → شهر واحد
 *   .بريم @user 3 اشهر     → 3 أشهر
 *   .بريم @user 1 سنة      → سنة كاملة
 *   .بريم @user دائم       → دائم (10 سنوات)
 *   .تجديد_بريم @user 30   → يضيف 30 يوم للوقت الحالي
 *   .حذف_بريم @user        → إزالة VIP
 */
import { logTransaction, initEconomy, MAX_ENERGY } from '../lib/economy.js'

const DAY  = 24 * 60 * 60 * 1000
const WEEK = 7  * DAY
const MONTH = 30 * DAY
const YEAR  = 365 * DAY
const FOREVER = 10 * YEAR

const VIP_BONUS_MONEY   = 50_000
const VIP_BONUS_BANK    = 10_000
const VIP_BONUS_DIAMOND = 50

// ── تحليل المدة من النص ────────────────────────────────────────────────────
function parseDuration(parts = []) {
  if (!parts.length) return FOREVER
  const raw = parts.join(' ').trim().toLowerCase()

  if (/دائم|permanent|forever|∞/.test(raw)) return FOREVER

  // رقم متبوع بوحدة
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(.*)$/)
  if (match) {
    const n    = parseFloat(match[1])
    const unit = match[2].trim()
    if (/^(d|day|يوم|ايام|أيام)/.test(unit))  return Math.round(n * DAY)
    if (/^(w|week|اسبوع|أسبوع|اسابيع)/.test(unit)) return Math.round(n * WEEK)
    if (/^(m|month|شهر|اشهر|أشهر|شهور)/.test(unit)) return Math.round(n * MONTH)
    if (/^(y|year|سنة|سنه|سنوات)/.test(unit))  return Math.round(n * YEAR)
    // رقم فقط بدون وحدة → أيام
    if (!unit) return Math.round(n * DAY)
  }
  return FOREVER
}

function formatDuration(ms) {
  if (ms >= YEAR * 5) return '♾️ دائم'
  const days = Math.round(ms / DAY)
  if (days >= 365) return `${(days / 365).toFixed(1)} سنة`
  if (days >= 30)  return `${Math.round(days / 30)} شهر`
  if (days >= 7)   return `${Math.round(days / 7)} أسبوع`
  return `${days} يوم`
}

function formatExpiry(ts) {
  if (ts - Date.now() >= YEAR * 5) return '♾️ دائم'
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function remaining(ts) {
  const diff = ts - Date.now()
  if (diff <= 0) return 'منتهي'
  if (diff >= YEAR * 5) return '♾️ دائم'
  const days = Math.ceil(diff / DAY)
  if (days >= 365) return `${Math.floor(days/365)} سنة و${Math.floor((days%365)/30)} شهر`
  if (days >= 30)  return `${Math.floor(days/30)} شهر و${days%30} يوم`
  return `${days} يوم`
}

// ── تحليل المستخدم المستهدف ─────────────────────────────────────────────────
function resolveTarget(m, text) {
  const mention = m.mentionedJid?.[0]
  const quoted  = m.quoted?.sender
  if (mention) {
    const num = mention.split('@')[0].replace(/\D/g,'')
    const rest = text?.replace(/@\d+/g,'').trim()
    return { jid: `${num}@s.whatsapp.net`, num, rest }
  }
  if (quoted) {
    const num = quoted.split('@')[0].replace(/\D/g,'')
    return { jid: `${num}@s.whatsapp.net`, num, rest: text?.trim() }
  }
  // رقم في النص
  if (text) {
    const numMatch = text.match(/^\+?(\d{7,15})(.*)$/)
    if (numMatch) {
      const num = numMatch[1]
      const rest = numMatch[2]?.trim()
      return { jid: `${num}@s.whatsapp.net`, num, rest }
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
let handler = async (m, { conn, text, command }) => {
  const getName = async jid => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }

  // ── حذف بريم ──────────────────────────────────────────────────────────────
  if (/^(حذف_بريم|delprem|removeprem|-prem)$/i.test(command)) {
    const t = resolveTarget(m, text)
    if (!t) return m.reply(`حدد المستخدم:\n.حذف_بريم @الشخص`)

    global.prems = (global.prems || []).filter(n => n.replace(/\D/g,'') !== t.num)
    const u = global.db.data.users[t.jid]
    if (u) {
      u.premium = false
      u.premiumTime = 0
      u.infiniteResources = false
    }
    await global.db.write()
    const name = await getName(t.jid)
    return conn.sendMessage(m.chat,
      { text: `🗑️ تم إزالة VIP من *${name}* (@${t.num})`, mentions: [t.jid] }, { quoted: m })
  }

  // ── تجديد بريم ───────────────────────────────────────────────────────────
  if (/^(تجديد_بريم|renewprem|extend_prem)$/i.test(command)) {
    const t = resolveTarget(m, text)
    if (!t) return m.reply(`حدد المستخدم:\n.تجديد_بريم @الشخص [مدة]`)

    const durationParts = (t.rest || '').split(/\s+/).filter(Boolean)
    const duration = parseDuration(durationParts)

    global.db.data.users[t.jid] ||= {}
    const u = global.db.data.users[t.jid]
    initEconomy(u)

    const base = Math.max(u.premiumTime || 0, Date.now())
    u.premium     = true
    u.premiumTime = base + duration
    u.infiniteResources = true
    if (!global.prems.includes(t.num)) global.prems.push(t.num)

    await global.db.write()
    const name = await getName(t.jid)
    return conn.sendMessage(m.chat, {
      text: `🔄 *تجديد VIP*\n\n👤 @${t.num}\n➕ إضافة: ${formatDuration(duration)}\n📅 ينتهي في: ${formatExpiry(u.premiumTime)}\n⏳ المتبقي: ${remaining(u.premiumTime)}`,
      mentions: [t.jid]
    }, { quoted: m })
  }

  // ── إضافة بريم ───────────────────────────────────────────────────────────
  const t = resolveTarget(m, text)
  if (!t) return m.reply(
`*إضافة VIP* 👑

الاستخدام:
.بريم @الشخص [مدة]

أمثلة:
.بريم @الشخص 30           (30 يوم)
.بريم @الشخص 1 شهر
.بريم @الشخص 3 اشهر
.بريم @الشخص 1 سنة
.بريم @الشخص دائم

أوامر أخرى:
.تجديد_بريم @الشخص [مدة]
.حذف_بريم @الشخص
.المميزين  (عرض القائمة)`)

  if (global.prems?.includes(t.num)) {
    // إذا كان موجوداً اسأل عن التجديد
    const u = global.db.data.users[t.jid] || {}
    const name = await getName(t.jid)
    return conn.sendMessage(m.chat, {
      text: `⚠️ *${name}* (@${t.num}) مميز بالفعل!\n\n📅 ينتهي: ${formatExpiry(u.premiumTime || 0)}\n⏳ المتبقي: ${remaining(u.premiumTime || 0)}\n\nللتجديد:\n.تجديد_بريم @${t.num} [مدة]`,
      mentions: [t.jid]
    }, { quoted: m })
  }

  const durationParts = (t.rest || '').split(/\s+/).filter(Boolean)
  const duration = parseDuration(durationParts)

  global.prems ||= []
  global.prems.push(t.num)

  global.db.data.users[t.jid] ||= {}
  const u = global.db.data.users[t.jid]
  initEconomy(u)

  u.premium           = true
  u.premiumTime       = Date.now() + duration
  u.premiumDate       = Date.now()
  u.infiniteResources = true
  u.energy            = MAX_ENERGY
  u.lastEnergyRegen   = Date.now()
  u.money             = (u.money  || 0) + VIP_BONUS_MONEY
  u.bank              = (u.bank   || 0) + VIP_BONUS_BANK
  u.diamond           = (u.diamond|| 0) + VIP_BONUS_DIAMOND

  logTransaction(u, 'earn', VIP_BONUS_MONEY, '👑 هدية ترقية VIP')
  await global.db.write()

  const name = await getName(t.jid)
  return conn.sendMessage(m.chat, {
    text:
`╭────『 👑 ترقية VIP 』────
│
│ ✅ @${t.num} | ${name}
│
│ ⏱️ المدة: ${formatDuration(duration)}
│ 📅 تاريخ الانتهاء: ${formatExpiry(u.premiumTime)}
│
│ 💰 هدية: +${VIP_BONUS_MONEY.toLocaleString('en')} 🪙
│ 🏦 بنك:  +${VIP_BONUS_BANK.toLocaleString('en')} 🪙
│ 💎 ماس:  +${VIP_BONUS_DIAMOND}
│ ⚡ طاقة: ${MAX_ENERGY}/${MAX_ENERGY}
│
│ ⭐ يتخطى جميع قيود الأوامر
╰──────────────────`,
    mentions: [t.jid]
  }, { quoted: m })
}

handler.help = ['بريم <@user> [مدة]', 'تجديد_بريم <@user> [مدة]', 'حذف_بريم <@user>']
handler.tags = ['owner']
handler.command = /^(add|\+)prem$|^(بريم|myprem|addprem|تجديد_بريم|renewprem|extend_prem|حذف_بريم|delprem|removeprem|-prem)$/i
handler.rowner = true

export default handler
