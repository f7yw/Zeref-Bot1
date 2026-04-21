/**
 * JID Utilities — SHADOW Bot
 * Helpers لتحويل LID JIDs إلى أرقام هواتف حقيقية للعرض.
 *
 * في WhatsApp Multi-Device قد يأتي m.sender كـ "158884446605486@lid"
 * بدلاً من رقم الهاتف الحقيقي. هذه الأدوات تحلّ هذه المشكلة باستخدام
 * global.lidPhoneMap الذي يبنيه main.js + handler.js على مدار التشغيل.
 */

/**
 * يعيد JID مُعادًا للحلّ إلى @s.whatsapp.net إن أمكن.
 * إن لم يوجد LID مخزّن، يُعاد الـ jid كما هو.
 */
export function resolvePhoneJid(jid) {
  if (!jid) return jid
  if (typeof jid !== 'string') return jid
  if (!jid.endsWith('@lid')) return jid
  const map = global.lidPhoneMap || {}
  return map[jid] || jid
}

/**
 * يعيد رقم الهاتف فقط (بدون النطاق) للعرض.
 *  - إن كان JID @s.whatsapp.net → يعيد الأرقام مباشرة.
 *  - إن كان @lid وموجود في الخريطة → يعيد رقم الهاتف الحقيقي.
 *  - إن كان @lid وليس مخزّناً → يعيد رقم LID (آخر حل احتياطي).
 */
export function displayPhone(jid) {
  if (!jid || typeof jid !== 'string') return '?'
  const resolved = resolvePhoneJid(jid)
  return String(resolved).split('@')[0].replace(/\D/g, '') || '?'
}

/**
 * تحديث خريطة LID→Phone عند اكتشاف ربط جديد، مع كتابة دورية للـ DB.
 */
export function recordLidMapping(lid, phoneJid) {
  if (!lid || !phoneJid) return
  global.lidPhoneMap ??= {}
  if (global.lidPhoneMap[lid] === phoneJid) return
  global.lidPhoneMap[lid] = phoneJid
  try { if (global.db?.data) global.db.data.lidPhoneMap = global.lidPhoneMap } catch (_) {}
  try { global.db?.markDirty?.() } catch (_) {}
}

/**
 * يعيد قائمة JIDs المعدّلة للذكر (mentions) — في WhatsApp,
 * الذكر يحتاج JID الأصلي الذي وصلت منه الرسالة (@lid أو @s.whatsapp.net).
 * نضمّن الاثنين للأمان.
 */
export function mentionsFor(jids) {
  const arr = Array.isArray(jids) ? jids : [jids]
  const out = new Set()
  for (const j of arr) {
    if (!j) continue
    out.add(j)
    const resolved = resolvePhoneJid(j)
    if (resolved && resolved !== j) out.add(resolved)
  }
  return Array.from(out)
}

export default { displayPhone, resolvePhoneJid, recordLidMapping, mentionsFor }
