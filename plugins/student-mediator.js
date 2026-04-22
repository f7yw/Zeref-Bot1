/**
 * أوامر إدارة المجموعات الأساسية
 * الأولوية: المطور > المميز = مشرف المجموعة > عادي
 */
import { isVip } from '../lib/economy.js'

const DEVELOPERS = [
  // ضع أرقام المطورين هنا بصيغة jid كاملة
  // مثال: '9665xxxxxxx@s.whatsapp.net'
]

function cleanNumber(input = '') {
  return input.replace(/[^0-9]/g, '')
}

function normalizeJid(jid = '') {
  if (!jid) return ''
  if (jid.includes('@')) return jid
  return `${jid}@s.whatsapp.net`
}

function targetUser(m, args) {
  const mention = m.mentionedJid?.[0]
  const quoted = m.quoted?.sender
  const number = cleanNumber(args.join(' '))

  if (mention) return normalizeJid(mention)
  if (quoted) return normalizeJid(quoted)
  if (number.length >= 7) return `${number}@s.whatsapp.net`
  return null
}

function participantJids(participants = []) {
  return [...new Set(
    participants
      .map(p => p.id || p.jid)
      .filter(Boolean)
      .map(normalizeJid)
  )]
}

function getParticipantMeta(participants = [], jid = '') {
  const target = normalizeJid(jid)
  return participants.find(p => normalizeJid(p.id || p.jid) === target) || null
}

function isAdminMeta(p) {
  return !!p && (p.admin === 'admin' || p.admin === 'superadmin')
}

function isOwnerMeta(p) {
  return !!p && p.admin === 'superadmin'
}

function isDeveloper(jid = '') {
  return DEVELOPERS.includes(normalizeJid(jid))
}

function explainError(e) {
  const raw = [
    e?.data,
    e?.output?.statusCode,
    e?.message
  ]
    .filter(Boolean)
    .join(' ')
    .toString()
    .toLowerCase()

  if (raw.includes('forbidden') || raw.includes('403')) {
    return 'تعذر تنفيذ الأمر. قد يكون الهدف محميًا داخل المجموعة أو لا توجد صلاحية كافية.'
  }
  if (raw.includes('not-authorized') || raw.includes('401')) {
    return 'لا توجد صلاحية لتنفيذ هذا الأمر.'
  }
  if (raw.includes('item-not-found') || raw.includes('404')) {
    return 'هذا الرقم غير موجود على واتساب.'
  }
  if (raw.includes('conflict') || raw.includes('409')) {
    return 'العضو موجود مسبقًا أو حالته لا تسمح بالعملية.'
  }
  if (raw.includes('bad-request') || raw.includes('400')) {
    return 'الرقم غير صالح أو لا يمكن تنفيذه بهذه الطريقة.'
  }
  if (raw.includes('rate') || raw.includes('429')) {
    return 'تم تجاوز الحد المسموح، حاول لاحقًا.'
  }
  return 'فشل تنفيذ الأمر. تأكد من صحة الرقم وصلاحيات المجموعة.'
}

async function safeUpdate(conn, chat, jids, action) {
  try {
    const res = await conn.groupParticipantsUpdate(chat, jids, action)
    const failed = (res || []).filter(r => r.status && r.status !== '200')

    if (failed.length === (jids?.length || 0) && failed.length > 0) {
      const codes = failed.map(f => f.status).join(',')
      throw Object.assign(new Error('all-failed: ' + codes), { data: codes })
    }

    return { ok: true, res }
  } catch (e) {
    return { ok: false, error: e, message: explainError(e) }
  }
}

async function safeReply(conn, m, text) {
  try {
    return await conn.sendMessage(m.chat, { text }, { quoted: m })
  } catch {
    return m.reply(text)
  }
}

let handler = async (m, { conn, args, text, command, participants = [], usedPrefix }) => {
  const getName = async (jid) => {
    try {
      return await conn.getName(jid)
    } catch {
      return normalizeJid(jid).split('@')[0]
    }
  }

  // ── تغيير اسم القروب ─────────────────────────────────────────────────────
  if (/^(اسم_القروب|اسم-القروب|تغيير_الاسم|setname)$/i.test(command)) {
    if (!text) return m.reply(`اكتب الاسم الجديد:\n${usedPrefix}${command} الاسم الجديد`)
    try {
      await conn.groupUpdateSubject(m.chat, text.trim())
      return m.reply(`✅ تم تغيير اسم القروب إلى:\n*${text.trim()}*`)
    } catch (e) {
      return m.reply(`❌ تعذر تغيير اسم القروب.\nالسبب: ${explainError(e)}`)
    }
  }

  // ── تغيير وصف القروب ────────────────────────────────────────────────────
  if (/^(وصف_القروب|وصف-القروب|setdesc)$/i.test(command)) {
    if (!text) return m.reply(`اكتب الوصف الجديد:\n${usedPrefix}${command} الوصف`)
    try {
      await conn.groupUpdateDescription(m.chat, text.trim())
      return m.reply(`✅ تم تغيير وصف القروب.`)
    } catch (e) {
      return m.reply(`❌ تعذر تغيير الوصف.\nالسبب: ${explainError(e)}`)
    }
  }

  // ── طرد عضو ───────────────────────────────────────────────────────────────
  if (/^(طرد|kick|حذف)$/i.test(command)) {
    const target = targetUser(m, args)
    if (!target) return m.reply(`حدد العضو:\n${usedPrefix}${command} @الشخص`)

    if (target === normalizeJid(conn.user?.jid || conn.user?.id || '')) {
      return m.reply('❌ لا أستطيع طرد نفسي.')
    }

    const targetMeta = getParticipantMeta(participants, target)
    if (!targetMeta) return m.reply('❌ العضو غير موجود داخل بيانات المجموعة.')
    if (isAdminMeta(targetMeta) || isOwnerMeta(targetMeta)) {
      return m.reply('❌ لا يمكن طرد مشرف أو مالك المجموعة.')
    }

    const r = await safeUpdate(conn, m.chat, [target], 'remove')
    if (!r.ok) return m.reply(`❌ تعذر طرد @${target.split('@')[0]}\nالسبب: ${r.message}`)

    return safeReply(conn, m, `✅ تم طرد @${target.split('@')[0]}`)
  }

  // ── إضافة عضو ─────────────────────────────────────────────────────────────
  if (/^(اضف|إضافة|اضافة|add)$/i.test(command)) {
    const target = targetUser(m, args)
    if (!target) return m.reply(`اكتب رقم العضو مع رمز الدولة:\n${usedPrefix}${command} 967xxxxxxxx`)

    const r = await safeUpdate(conn, m.chat, [target], 'add')
    if (!r.ok) {
      let link = ''
      try {
        const code = await conn.groupInviteCode(m.chat).catch(() => null)
        if (code) link = `\nرابط الدعوة: https://chat.whatsapp.com/${code}`
      } catch {}

      return m.reply(`❌ تعذر إضافة @${target.split('@')[0]}\nالسبب: ${r.message}${link}`)
    }

    return safeReply(conn, m, `✅ تم إرسال طلب إضافة @${target.split('@')[0]}`)
  }

  // ── ترقية لمشرف ──────────────────────────────────────────────────────────
  if (/^(رفع|ترقية|promote|مشرف)$/i.test(command)) {
    const target = targetUser(m, args)
    if (!target) return m.reply(`حدد العضو:\n${usedPrefix}${command} @الشخص`)

    const targetMeta = getParticipantMeta(participants, target)
    if (!targetMeta) return m.reply('❌ العضو غير موجود داخل بيانات المجموعة.')
    if (isAdminMeta(targetMeta)) return m.reply('❌ العضو مشرف بالفعل.')

    const r = await safeUpdate(conn, m.chat, [target], 'promote')
    if (!r.ok) return m.reply(`❌ تعذر الترقية\nالسبب: ${r.message}`)

    const name = await getName(target)
    return safeReply(conn, m, `✅ *${name}* (@${target.split('@')[0]}) أصبح مشرفاً 👑`)
  }

  // ── خفض مشرف ─────────────────────────────────────────────────────────────
  if (/^(خفض|تنزيل|demote)$/i.test(command)) {
    const target = targetUser(m, args)
    if (!target) return m.reply(`حدد العضو:\n${usedPrefix}${command} @الشخص`)

    const targetMeta = getParticipantMeta(participants, target)
    if (!targetMeta) return m.reply('❌ العضو غير موجود داخل بيانات المجموعة.')
    if (!isAdminMeta(targetMeta)) return m.reply('❌ العضو ليس مشرفاً.')

    const r = await safeUpdate(conn, m.chat, [target], 'demote')
    if (!r.ok) return m.reply(`❌ تعذر الخفض\nالسبب: ${r.message}`)

    const name = await getName(target)
    return safeReply(conn, m, `✅ تم خفض *${name}* (@${target.split('@')[0]}) من الإشراف`)
  }

  // ── قفل القروب ───────────────────────────────────────────────────────────
  if (/^(قفل_القروب|قفل-القروب|closegc|قفل)$/i.test(command)) {
    try {
      await conn.groupSettingUpdate(m.chat, 'announcement')
      return m.reply(`🔒 تم قفل القروب. المشرفون فقط يمكنهم الإرسال.`)
    } catch (e) {
      return m.reply(`❌ تعذر قفل القروب.\nالسبب: ${explainError(e)}`)
    }
  }

  // ── فتح القروب ───────────────────────────────────────────────────────────
  if (/^(فتح_القروب|فتح-القروب|opengc|فتح)$/i.test(command)) {
    try {
      await conn.groupSettingUpdate(m.chat, 'not_announcement')
      return m.reply(`🔓 تم فتح القروب. الجميع يمكنهم الإرسال.`)
    } catch (e) {
      return m.reply(`❌ تعذر فتح القروب.\nالسبب: ${explainError(e)}`)
    }
  }

  const members = participantJids(participants)

  // ── منشن مخفي ─────────────────────────────────────────────────────────────
  if (/^(منشن_مخفي|منشن-مخفي|مخفي|hidetag)$/i.test(command)) {
    const msg = text || 'تنبيه للجميع'
    return conn.sendMessage(m.chat, { text: msg, mentions: members }, { quoted: m })
  }

  // ── منشن ظاهر ─────────────────────────────────────────────────────────────
  if (/^(منشن_ظاهر|منشن-ظاهر|الكل|منشن|tagall)$/i.test(command)) {
    const header = text ? `*${text}*\n\n` : '*منشن جماعي:*\n\n'
    const list = members.map(jid => `@${jid.split('@')[0]}`).join(' ')
    return conn.sendMessage(m.chat, { text: header + list, mentions: members }, { quoted: m })
  }
}

handler.help = ['اسم_القروب', 'وصف_القروب', 'طرد', 'اضف', 'رفع', 'خفض', 'قفل_القروب', 'فتح_القروب', 'منشن_مخفي', 'منشن_ظاهر']
handler.tags = ['group']
handler.command = /^(اسم_القروب|اسم-القروب|تغيير_الاسم|setname|وصف_القروب|وصف-القروب|setdesc|طرد|kick|اضف|إضافة|اضافة|add|رفع|ترقية|promote|مشرف|خفض|تنزيل|demote|قفل_القروب|قفل-القروب|closegc|قفل|فتح_القروب|فتح-القروب|opengc|فتح|منشن_مخفي|منشن-مخفي|مخفي|hidetag|منشن_ظاهر|منشن-ظاهر|الكل|منشن|tagall)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
