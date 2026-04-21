/**
 * نظام إشعارات المطور (Owner Notifier)
 * ──────────────────────────────────────
 * يرسل رسائل احترافية ومنسَّقة إلى محادثة المطور الخاصة عند حدوث أي تغيير
 * مهم يلاحظه البوت (دخول/خروج من قروب، ترقية/خفض، اتصال/قطع بوت فرعي،
 * إلخ). لا يفشل أبداً — أي خطأ يُلتقط بصمت كي لا يكسر تدفق التشغيل.
 */

const RECENT_NOTIFICATIONS = new Map() // dedupe key → ts

function dedupe(key, windowMs = 30_000) {
  const now = Date.now()
  const last = RECENT_NOTIFICATIONS.get(key) || 0
  if (now - last < windowMs) return true
  RECENT_NOTIFICATIONS.set(key, now)
  // كنس بسيط للذاكرة
  if (RECENT_NOTIFICATIONS.size > 500) {
    for (const [k, t] of RECENT_NOTIFICATIONS) if (now - t > 5 * 60_000) RECENT_NOTIFICATIONS.delete(k)
  }
  return false
}

/**
 * يستخرج أرقام المالكين الحقيقيين (المطورين فقط) كصيغة JID.
 */
function ownerJids() {
  const list = global.owner || []
  const out = []
  for (const entry of list) {
    if (Array.isArray(entry)) {
      const num = String(entry[0] || '').replace(/\D/g, '')
      const isDev = entry[2] === true
      if (num && isDev) out.push(`${num}@s.whatsapp.net`)
    }
  }
  // عند عدم تحديد أي مطور صراحة → استخدم أول مالك
  if (!out.length && list.length) {
    const first = list[0]
    const num = String(Array.isArray(first) ? first[0] : first).replace(/\D/g, '')
    if (num) out.push(`${num}@s.whatsapp.net`)
  }
  return out
}

/**
 * أرسل رسالة نصية لكل مطورين البوت من خلال البوت الرئيسي.
 * @param {string} text - النص (يدعم تنسيق واتساب)
 * @param {object} [opts]
 * @param {string} [opts.dedupeKey] - مفتاح فريد لمنع التكرار خلال نافذة 30 ثانية
 * @param {object} [opts.conn] - استخدم اتصالاً محدداً (افتراضياً global.conn)
 */
export async function notifyOwners(text, opts = {}) {
  try {
    const conn = opts.conn || global.conn
    if (!conn || !conn.user) return false
    if (opts.dedupeKey && dedupe(opts.dedupeKey)) return false
    const targets = ownerJids()
    if (!targets.length) return false
    for (const jid of targets) {
      try {
        await conn.sendMessage(jid, { text }).catch(() => {})
      } catch (_) {}
    }
    return true
  } catch (_) {
    return false
  }
}

/**
 * يبني عنوان رسالة موحَّد مع شعار البوت.
 */
export function header(emoji, title, conn) {
  const botName = conn?.user?.name || 'ZEREF'
  const botPhone = conn?.user?.id ? `+${String(conn.user.id).split('@')[0].split(':')[0].replace(/\D/g, '')}` : ''
  const isSub = !!conn?.__subBotPhone
  const role = isSub ? '🤖 بوت فرعي' : '🤖 البوت الرئيسي'
  return (
`╭───『 ${emoji} ${title} 』
│ ${role}
│ 📛 ${botName}${botPhone ? `  (${botPhone})` : ''}
│ 🕐 ${new Date().toLocaleString('ar-EG', { hour12: false })}
╰────────`
  )
}

/**
 * إشعار: تغيّر حالة بوت فرعي (اتصل / فُصل / تسجيل خروج / إعادة اتصال).
 */
export async function notifySubBotEvent(phone, event, details = {}) {
  const conn = global.conn
  if (!conn) return
  const labels = {
    connected:    { emoji: '🟢', title: 'بوت فرعي اتصل',           tone: 'البوت الفرعي متصل وجاهز للعمل.' },
    disconnected: { emoji: '🟡', title: 'بوت فرعي انفصل',           tone: 'سيُعاد المحاولة تلقائياً.' },
    reconnecting: { emoji: '🔄', title: 'إعادة اتصال بوت فرعي',     tone: `محاولة ${details.attempts || 1}/5 خلال ${details.delayMs || 0}ms` },
    loggedOut:    { emoji: '🚫', title: 'تسجيل خروج بوت فرعي',      tone: 'الجلسة أُبطلت من واتساب — تم التنظيف الكامل.' },
    paired:       { emoji: '🆕', title: 'بوت فرعي جديد قيد الإقران', tone: 'في انتظار إدخال الكود من المستخدم.' },
    superseded:   { emoji: '↩️', title: 'استبدال جلسة بوت فرعي',    tone: 'جلسة أحدث استلمت المسؤولية.' },
    failed:       { emoji: '❌', title: 'فشل بوت فرعي',             tone: details.error || 'سبب غير معروف.' }
  }
  const meta = labels[event] || { emoji: 'ℹ️', title: `حدث: ${event}`, tone: '' }
  const text =
`${header(meta.emoji, meta.title, conn)}

📞 *الرقم:* +${phone}
📍 *الحدث:* ${meta.title}
${details.code ? `🔢 *كود الإغلاق:* \`${details.code}\`\n` : ''}${details.features ? `🧩 *المزايا:* ${details.features.join(', ') || '—'}\n` : ''}
💬 ${meta.tone}`.trim()

  await notifyOwners(text, { dedupeKey: `sub:${phone}:${event}:${details.code || ''}` })
}

/**
 * إشعار: تغيّر حال البوت الرئيسي/الفرعي في مجموعة (انضم / طُرد / رُقّي / خُفض).
 */
export async function notifyGroupEvent(conn, groupId, event, details = {}) {
  if (!conn) return
  let groupName = groupId
  let memberCount = '?'
  try {
    const meta = (conn.chats?.[groupId]?.metadata) || await conn.groupMetadata(groupId).catch(() => null)
    if (meta) {
      groupName = meta.subject || groupId
      memberCount = meta.participants?.length ?? '?'
    }
  } catch (_) {}

  const labels = {
    joined:   { emoji: '➕', title: 'البوت انضم لمجموعة جديدة' },
    left:     { emoji: '👋', title: 'البوت غادر/طُرد من مجموعة' },
    promoted: { emoji: '⬆️', title: 'البوت أصبح مشرفاً' },
    demoted:  { emoji: '⬇️', title: 'البوت خُفض من الإشراف' }
  }
  const meta = labels[event] || { emoji: 'ℹ️', title: `حدث: ${event}` }
  const by = details.byJid ? `\n👤 *بواسطة:* @${String(details.byJid).split('@')[0]}` : ''
  const text =
`${header(meta.emoji, meta.title, conn)}

📛 *المجموعة:* ${groupName}
🆔 \`${groupId}\`
👥 *الأعضاء:* ${memberCount}${by}
${details.note ? `\n📝 ${details.note}` : ''}`.trim()

  await notifyOwners(text, { dedupeKey: `grp:${groupId}:${event}` })
}

/**
 * مرحلة تقدّم — يُعدِّل رسالة موجودة (في محادثة المستخدم) مع شريط مراحل.
 * يُرجع كائناً عليه دالة `step(label, status)` و`done(finalText)`.
 *
 * @param {object} conn
 * @param {object} m   رسالة المستخدم الأصلية (للرد عليها)
 * @param {string[]} stages أسماء المراحل بالترتيب
 */
export async function progressTracker(conn, m, stages) {
  const states = stages.map(name => ({ name, status: 'pending' })) // pending|active|done|error
  let messageKey = null

  const render = (footer = '') => {
    const lines = states.map(s => {
      const icon = s.status === 'done' ? '✅' : s.status === 'active' ? '⏳' : s.status === 'error' ? '❌' : '⚪'
      return `${icon} ${s.name}`
    }).join('\n')
    return `╭───『 🛠️ تقدّم العملية 』\n│\n${lines.split('\n').map(l => `│ ${l}`).join('\n')}\n│\n╰────────${footer ? `\n\n${footer}` : ''}`
  }

  // ابدأ
  const sent = await conn.sendMessage(m.chat, { text: render() }, { quoted: m }).catch(() => null)
  messageKey = sent?.key || null

  const update = async (footer = '') => {
    if (!messageKey) return
    try {
      await conn.sendMessage(m.chat, { text: render(footer), edit: messageKey })
    } catch (_) {
      // إذا فشل التعديل، أرسل رسالة جديدة
      const s = await conn.sendMessage(m.chat, { text: render(footer) }, { quoted: m }).catch(() => null)
      if (s?.key) messageKey = s.key
    }
  }

  return {
    /** يبدأ مرحلة (يضع باقي السابقات done إن لم تُحدَّد) */
    async start(name, footer = '') {
      const idx = states.findIndex(s => s.name === name)
      if (idx === -1) return
      for (let i = 0; i < idx; i++) if (states[i].status === 'pending' || states[i].status === 'active') states[i].status = 'done'
      states[idx].status = 'active'
      await update(footer)
    },
    async finish(name, footer = '') {
      const s = states.find(x => x.name === name)
      if (s) s.status = 'done'
      await update(footer)
    },
    async error(name, footer = '') {
      const s = states.find(x => x.name === name)
      if (s) s.status = 'error'
      await update(footer)
    },
    async done(footer = '') {
      for (const s of states) if (s.status !== 'error') s.status = 'done'
      await update(footer)
    }
  }
}

export default { notifyOwners, notifySubBotEvent, notifyGroupEvent, progressTracker, header }
