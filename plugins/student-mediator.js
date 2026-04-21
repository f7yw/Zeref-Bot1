/**
 * plugins/student-mediator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * قسم وسيط طلاب الجامعة (مطور فقط)
 *
 * يسمح للمطور بالتواصل مع طلاب الجامعة بشكل غير مباشر عبر هوية البوت:
 *   • تسجيل الطلاب (رقم/اسم/مجموعة)
 *   • ربط قروبات طلابية
 *   • إرسال رسائل فردية أو جماعية بدون كشف هوية المطور
 *   • تتبع ردود الطلاب في صندوق وارد
 *   • ردود مزخرفة + توقيع تلقائي
 *
 * كل التعديلات تُحفظ عبر global.db.markDirty() (Supabase sync).
 */

// ─────────────────────────────────────────────────────────────────────────────
function db() {
  global.db.data.mediator ??= {
    enabled: true,
    signature: '',
    hideSource: true,
    students: {},        // { jid: { name, group, addedAt } }
    groups: {},          // { jid: { label, addedAt } }
    inbox: [],           // { id, from, name, text, ts, replied }
    nextInboxId: 1
  }
  return global.db.data.mediator
}

function dirty() { try { global.db.markDirty?.() } catch (_) {} }

function normalizeJid(input) {
  if (!input) return null
  let s = String(input).trim()
  if (s.includes('@')) return s
  s = s.replace(/\D/g, '')
  if (!s) return null
  if (s.length > 15) return s + '@g.us' // group jid (numeric long)
  return s + '@s.whatsapp.net'
}

function isOwnerSender(m) {
  const num = (m.sender || '').replace(/\D/g, '')
  return (global.owner || []).some(o =>
    Array.isArray(o)
      ? String(o[0]).replace(/\D/g, '') === num
      : String(o).replace(/\D/g, '') === num
  )
}

function decorate(text, kind = 'msg') {
  const M = db()
  const sig = M.signature ? `\n\n— ${M.signature}` : ''
  const head = kind === 'announce'
    ? '📢 *إعلان رسمي*\n\n'
    : kind === 'broadcast'
      ? '📣 *رسالة من إدارة الطلاب*\n\n'
      : ''
  return `${head}${text}${sig}`
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) تسجيل الطلاب: طلاب اضف|حذف|قائمة|بحث|تجميع
const studentsHandler = async (m, { conn, args, command }) => {
  if (!isOwnerSender(m)) return m.reply('🔒 هذا الأمر للمطور فقط')
  const M = db()
  const sub = (args[0] || '').toLowerCase()

  if (sub === 'اضف' || sub === 'add') {
    const jid = normalizeJid(args[1])
    if (!jid) return m.reply('📝 الصيغة: *طلاب اضف <رقم> [اسم]*')
    const name = args.slice(2).join(' ') || 'بدون اسم'
    M.students[jid] = { name, group: M.students[jid]?.group || '', addedAt: Date.now() }
    dirty()
    return m.reply(`✅ تم تسجيل الطالب\n\n👤 ${name}\n📱 ${jid.split('@')[0]}`)
  }
  if (sub === 'حذف' || sub === 'del' || sub === 'remove') {
    const jid = normalizeJid(args[1])
    if (!jid || !M.students[jid]) return m.reply('❌ هذا الطالب غير مسجّل')
    const name = M.students[jid].name
    delete M.students[jid]
    dirty()
    return m.reply(`🗑️ تم حذف الطالب: ${name}`)
  }
  if (sub === 'قائمة' || sub === 'list') {
    const list = Object.entries(M.students)
    if (!list.length) return m.reply('📭 لا يوجد طلاب مسجّلون بعد')
    const text = list.map(([jid, s], i) =>
      `${i + 1}. ${s.name} — ${jid.split('@')[0]}${s.group ? ` (${s.group})` : ''}`
    ).join('\n')
    return m.reply(`📚 *قائمة الطلاب (${list.length})*\n\n${text}`)
  }
  if (sub === 'بحث' || sub === 'search') {
    const q = args.slice(1).join(' ').toLowerCase().trim()
    if (!q) return m.reply('📝 الصيغة: *طلاب بحث <اسم/رقم>*')
    const hits = Object.entries(M.students).filter(([jid, s]) =>
      jid.includes(q) || s.name.toLowerCase().includes(q)
    )
    if (!hits.length) return m.reply('🔍 لا توجد نتائج')
    return m.reply(`🔍 *${hits.length} نتيجة*\n\n` + hits.map(([jid, s]) =>
      `• ${s.name} — ${jid.split('@')[0]}${s.group ? ` (${s.group})` : ''}`
    ).join('\n'))
  }
  if (sub === 'تجميع' || sub === 'group') {
    const jid = normalizeJid(args[1])
    if (!jid || !M.students[jid]) return m.reply('❌ الطالب غير مسجّل\n📝 الصيغة: *طلاب تجميع <رقم> <اسم_المجموعة>*')
    const grp = args.slice(2).join(' ')
    if (!grp) return m.reply('📝 حدّد اسم المجموعة (مثلاً: شُعبة-أ أو سنة-2)')
    M.students[jid].group = grp
    dirty()
    return m.reply(`✅ تم تصنيف ${M.students[jid].name} إلى مجموعة: ${grp}`)
  }
  return m.reply('📚 *إدارة الطلاب*\n\n' +
    '• طلاب اضف <رقم> [اسم]\n' +
    '• طلاب حذف <رقم>\n' +
    '• طلاب قائمة\n' +
    '• طلاب بحث <اسم/رقم>\n' +
    '• طلاب تجميع <رقم> <مجموعة>')
}
studentsHandler.help = ['طلاب']
studentsHandler.tags = ['mediator']
studentsHandler.command = /^(طلاب|students)$/i

// ─────────────────────────────────────────────────────────────────────────────
// 2) القروبات الطلابية
const groupsHandler = async (m, { conn, args }) => {
  if (!isOwnerSender(m)) return m.reply('🔒 هذا الأمر للمطور فقط')
  const M = db()
  const sub = (args[0] || '').toLowerCase()

  if (sub === 'اضف' || sub === 'add') {
    const jid = normalizeJid(args[1] || (m.isGroup ? m.chat : ''))
    if (!jid || !jid.endsWith('@g.us')) return m.reply('📝 الصيغة: *مجموعات_الطلاب اضف <jid>* أو نفّذ من داخل القروب')
    const label = args.slice(2).join(' ') || 'بدون اسم'
    M.groups[jid] = { label, addedAt: Date.now() }
    dirty()
    return m.reply(`✅ تم ربط القروب: ${label}`)
  }
  if (sub === 'حذف' || sub === 'del') {
    const jid = normalizeJid(args[1] || (m.isGroup ? m.chat : ''))
    if (!jid || !M.groups[jid]) return m.reply('❌ القروب غير مربوط')
    const label = M.groups[jid].label
    delete M.groups[jid]
    dirty()
    return m.reply(`🗑️ تم فك الربط: ${label}`)
  }
  if (sub === 'قائمة' || sub === 'list') {
    const list = Object.entries(M.groups)
    if (!list.length) return m.reply('📭 لا توجد قروبات طلابية مربوطة')
    return m.reply(`👥 *القروبات الطلابية (${list.length})*\n\n` + list.map(([jid, g], i) =>
      `${i + 1}. ${g.label}\n   ${jid}`
    ).join('\n\n'))
  }
  return m.reply('👥 *إدارة القروبات الطلابية*\n\n' +
    '• مجموعات_الطلاب اضف <jid> [اسم]\n' +
    '• مجموعات_الطلاب حذف <jid>\n' +
    '• مجموعات_الطلاب قائمة')
}
groupsHandler.help = ['مجموعات_الطلاب']
groupsHandler.tags = ['mediator']
groupsHandler.command = /^(مجموعات[_\s]?الطلاب|student[_\s]?groups)$/i

// ─────────────────────────────────────────────────────────────────────────────
// 3) إرسال رسالة لطالب
const dmStudentHandler = async (m, { conn, args, text }) => {
  if (!isOwnerSender(m)) return m.reply('🔒 هذا الأمر للمطور فقط')
  const M = db()
  if (!M.enabled) return m.reply('⛔ الوسيط متوقف. شغّله بـ: *وسيط_الطلاب تشغيل*')
  let target = (m.mentionedJid || [])[0]
  let body = text
  if (target) {
    body = body.replace(/@\d+/g, '').trim()
  } else {
    target = normalizeJid(args[0])
    body = args.slice(1).join(' ').trim()
  }
  if (!target || !body) return m.reply('📝 الصيغة: *رسالة_لطالب @ <نص>* أو *رسالة_لطالب <رقم> <نص>*')
  if (!M.students[target]) return m.reply('⚠️ الطالب غير مسجّل. سجّله أولاً بـ: *طلاب اضف*')
  await conn.sendMessage(target, { text: decorate(body, 'msg') })
  return m.reply(`✅ أُرسلت إلى: ${M.students[target].name}`)
}
dmStudentHandler.help = ['رسالة_لطالب']
dmStudentHandler.tags = ['mediator']
dmStudentHandler.command = /^(رسالة[_\s]?لطالب|dm[_\s]?student)$/i

// ─────────────────────────────────────────────────────────────────────────────
// 4) رسالة لكل الطلاب فردياً (DM)
const dmAllHandler = async (m, { conn, text }) => {
  if (!isOwnerSender(m)) return m.reply('🔒 هذا الأمر للمطور فقط')
  const M = db()
  if (!M.enabled) return m.reply('⛔ الوسيط متوقف')
  const body = (text || '').trim()
  if (!body) return m.reply('📝 الصيغة: *رسالة_للطلاب <نص>*')
  const jids = Object.keys(M.students)
  if (!jids.length) return m.reply('📭 لا يوجد طلاب مسجّلون')

  await m.reply(`📤 جاري الإرسال إلى ${jids.length} طالب...`)
  let ok = 0, fail = 0
  for (const jid of jids) {
    try {
      await conn.sendMessage(jid, { text: decorate(body, 'msg') })
      ok++
      await new Promise(r => setTimeout(r, 800))
    } catch (_) { fail++ }
  }
  return m.reply(`✅ تم الإرسال\n\n📨 نجح: ${ok}\n❌ فشل: ${fail}`)
}
dmAllHandler.help = ['رسالة_للطلاب']
dmAllHandler.tags = ['mediator']
dmAllHandler.command = /^(رسالة[_\s]?للطلاب|dm[_\s]?all[_\s]?students)$/i

// ─────────────────────────────────────────────────────────────────────────────
// 5) رسالة لمجموعة طلابية (مصنّفة)
const dmGroupedHandler = async (m, { conn, args, text }) => {
  if (!isOwnerSender(m)) return m.reply('🔒 هذا الأمر للمطور فقط')
  const M = db()
  if (!M.enabled) return m.reply('⛔ الوسيط متوقف')
  const grp = args[0]
  const body = args.slice(1).join(' ').trim()
  if (!grp || !body) return m.reply('📝 الصيغة: *رسالة_لمجموعة <اسم_المجموعة> <نص>*')
  const targets = Object.entries(M.students).filter(([_, s]) => s.group === grp)
  if (!targets.length) return m.reply(`❌ لا يوجد طلاب في مجموعة: ${grp}`)
  await m.reply(`📤 إرسال إلى ${targets.length} طالب من مجموعة "${grp}"...`)
  let ok = 0, fail = 0
  for (const [jid] of targets) {
    try {
      await conn.sendMessage(jid, { text: decorate(body, 'msg') })
      ok++
      await new Promise(r => setTimeout(r, 800))
    } catch (_) { fail++ }
  }
  return m.reply(`✅ تم\n\n📨 نجح: ${ok}\n❌ فشل: ${fail}`)
}
dmGroupedHandler.help = ['رسالة_لمجموعة']
dmGroupedHandler.tags = ['mediator']
dmGroupedHandler.command = /^(رسالة[_\s]?لمجموعة|dm[_\s]?group)$/i

// ─────────────────────────────────────────────────────────────────────────────
// 6) بث للقروبات الطلابية
const broadcastHandler = async (m, { conn, text, command }) => {
  if (!isOwnerSender(m)) return m.reply('🔒 هذا الأمر للمطور فقط')
  const M = db()
  if (!M.enabled) return m.reply('⛔ الوسيط متوقف')
  const body = (text || '').trim()
  if (!body) return m.reply(`📝 الصيغة: *${command} <نص>*`)
  const kind = /^اعلان|announce/i.test(command) ? 'announce' : 'broadcast'
  const groups = Object.keys(M.groups)
  if (!groups.length) return m.reply('📭 لا توجد قروبات طلابية مربوطة')
  await m.reply(`📤 جاري البث إلى ${groups.length} قروب...`)
  let ok = 0, fail = 0
  for (const jid of groups) {
    try {
      await conn.sendMessage(jid, { text: decorate(body, kind) })
      ok++
      await new Promise(r => setTimeout(r, 1000))
    } catch (_) { fail++ }
  }
  return m.reply(`✅ تم البث\n\n📨 نجح: ${ok}\n❌ فشل: ${fail}`)
}
broadcastHandler.help = ['بث_للطلاب', 'اعلان']
broadcastHandler.tags = ['mediator']
broadcastHandler.command = /^(بث[_\s]?للطلاب|اعلان|announce|broadcast[_\s]?students)$/i

// ─────────────────────────────────────────────────────────────────────────────
// 7) صندوق الردود
const inboxHandler = async (m, { conn, args }) => {
  if (!isOwnerSender(m)) return m.reply('🔒 هذا الأمر للمطور فقط')
  const M = db()
  const list = M.inbox.slice(-30).reverse()
  if (!list.length) return m.reply('📭 الصندوق فارغ')
  const text = list.map(it => {
    const t = new Date(it.ts).toLocaleString('ar')
    const tag = it.replied ? '✅' : '🔵'
    return `${tag} #${it.id} — ${it.name} (${it.from.split('@')[0]})\n   📅 ${t}\n   💬 ${it.text.slice(0, 120)}`
  }).join('\n\n')
  return m.reply(`📬 *صندوق الردود (${list.length})*\n\n${text}\n\n_ردّ بـ: رد_على_طالب <id> <نص>_`)
}
inboxHandler.help = ['صندوق_الطلاب']
inboxHandler.tags = ['mediator']
inboxHandler.command = /^(صندوق[_\s]?الطلاب|student[_\s]?inbox)$/i

const replyInboxHandler = async (m, { conn, args }) => {
  if (!isOwnerSender(m)) return m.reply('🔒 هذا الأمر للمطور فقط')
  const M = db()
  const id = parseInt(args[0])
  const body = args.slice(1).join(' ').trim()
  if (!id || !body) return m.reply('📝 الصيغة: *رد_على_طالب <id> <نص>*')
  const item = M.inbox.find(x => x.id === id)
  if (!item) return m.reply('❌ لا يوجد رد بهذا المعرّف')
  await conn.sendMessage(item.from, { text: decorate(body, 'msg') })
  item.replied = true
  dirty()
  return m.reply(`✅ تم الرد على ${item.name}`)
}
replyInboxHandler.help = ['رد_على_طالب']
replyInboxHandler.tags = ['mediator']
replyInboxHandler.command = /^(رد[_\s]?على[_\s]?طالب|reply[_\s]?student)$/i

const clearInboxHandler = async (m) => {
  if (!isOwnerSender(m)) return m.reply('🔒 هذا الأمر للمطور فقط')
  const M = db()
  const n = M.inbox.length
  M.inbox = []
  M.nextInboxId = 1
  dirty()
  return m.reply(`🧹 تم مسح ${n} عنصر من الصندوق`)
}
clearInboxHandler.help = ['تصفير_صندوق']
clearInboxHandler.tags = ['mediator']
clearInboxHandler.command = /^(تصفير[_\s]?صندوق|clear[_\s]?inbox)$/i

// ─────────────────────────────────────────────────────────────────────────────
// 8) لوحة الإعدادات
const settingsHandler = async (m, { args }) => {
  if (!isOwnerSender(m)) return m.reply('🔒 هذا الأمر للمطور فقط')
  const M = db()
  const sub = (args[0] || '').toLowerCase()

  if (sub === 'تشغيل' || sub === 'on') {
    M.enabled = true; dirty()
    return m.reply('✅ تم تشغيل وسيط الطلاب')
  }
  if (sub === 'ايقاف' || sub === 'إيقاف' || sub === 'off') {
    M.enabled = false; dirty()
    return m.reply('⛔ تم إيقاف وسيط الطلاب')
  }
  if (sub === 'توقيع' || sub === 'signature') {
    const sig = args.slice(1).join(' ').trim()
    M.signature = sig; dirty()
    return m.reply(sig ? `✅ تم تعيين التوقيع:\n\n— ${sig}` : '🧹 تم مسح التوقيع')
  }
  if (sub === 'اخفاء_المصدر' || sub === 'hidesource') {
    M.hideSource = !M.hideSource; dirty()
    return m.reply(M.hideSource ? '🕶️ إخفاء المصدر: مفعّل' : '👁️ إخفاء المصدر: متوقف')
  }

  return m.reply(
    `⚙️ *إعدادات وسيط الطلاب*\n\n` +
    `• الحالة: ${M.enabled ? '✅ مفعّل' : '⛔ متوقف'}\n` +
    `• إخفاء المصدر: ${M.hideSource ? '🕶️ نعم' : '👁️ لا'}\n` +
    `• التوقيع: ${M.signature || '—'}\n` +
    `• الطلاب: ${Object.keys(M.students).length}\n` +
    `• القروبات: ${Object.keys(M.groups).length}\n` +
    `• في الصندوق: ${M.inbox.length}\n\n` +
    `الأوامر:\n` +
    `• وسيط_الطلاب تشغيل|ايقاف\n` +
    `• وسيط_الطلاب توقيع <نص>\n` +
    `• وسيط_الطلاب اخفاء_المصدر`
  )
}
settingsHandler.help = ['وسيط_الطلاب']
settingsHandler.tags = ['mediator']
settingsHandler.command = /^(وسيط[_\s]?الطلاب|mediator)$/i

// ─────────────────────────────────────────────────────────────────────────────
// 9) التقاط ردود الطلاب تلقائياً (handler.all)
const captureHandler = async function (m) {
  try {
    const M = db()
    if (!M.enabled) return
    if (m.isGroup) return
    if (!M.students[m.sender]) return
    const txt = (m.text || '').trim()
    if (!txt || /^[./#!]/.test(txt)) return
    if (txt.length < 2) return
    const id = M.nextInboxId++
    M.inbox.push({
      id,
      from: m.sender,
      name: M.students[m.sender].name,
      text: txt,
      ts: Date.now(),
      replied: false
    })
    if (M.inbox.length > 500) M.inbox.splice(0, M.inbox.length - 500)
    dirty()
    // إخطار المطور
    try {
      const owners = (global.owner || []).map(o => Array.isArray(o) ? o[0] : o).filter(Boolean)
      for (const ow of owners) {
        const jid = String(ow).replace(/\D/g, '') + '@s.whatsapp.net'
        await this.sendMessage(jid, {
          text: `📬 *رد جديد من طالب*\n\n👤 ${M.students[m.sender].name}\n📱 ${m.sender.split('@')[0]}\n🆔 #${id}\n\n💬 ${txt.slice(0, 200)}\n\n_للرد:_ *رد_على_طالب ${id} <نص>*`
        }).catch(() => {})
      }
    } catch (_) {}
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// تصدير كل المعالجات (نمط متعدد) — main.js يدعم default array أو متعدد عبر ملفات
// لكن بما أن plugin loader يستورد default واحد، ندمجها في كائن واحد عبر مفاتيح مميزة
// ولأن النظام يحمّل ملفاً = handler واحد، نحتاج لتصديرات متعددة كملفات منفصلة.
// لذا نُصدّر هنا handler «captureHandler» الذي يلتقط الردود + يضع باقي المعالجات في global
// عبر آلية تسجيل ذاتية.

;(() => {
  global.__mediatorHandlers ??= {
    students: studentsHandler,
    groups: groupsHandler,
    dmStudent: dmStudentHandler,
    dmAll: dmAllHandler,
    dmGrouped: dmGroupedHandler,
    broadcast: broadcastHandler,
    inbox: inboxHandler,
    replyInbox: replyInboxHandler,
    clearInbox: clearInboxHandler,
    settings: settingsHandler,
  }
})()

// المعالج الرئيسي (يلتقط الردود)
const handler = async (m, { conn, command, args, text, usedPrefix }) => {
  // dispatch حسب الأمر
  const cmd = String(command || '').toLowerCase()
  const H = global.__mediatorHandlers
  for (const h of Object.values(H)) {
    try {
      if (h.command && h.command.test(cmd)) {
        return h(m, { conn, command, args, text, usedPrefix })
      }
    } catch (_) {}
  }
}

handler.help = [
  'طلاب', 'مجموعات_الطلاب', 'رسالة_لطالب', 'رسالة_للطلاب',
  'رسالة_لمجموعة', 'بث_للطلاب', 'اعلان',
  'صندوق_الطلاب', 'رد_على_طالب', 'تصفير_صندوق', 'وسيط_الطلاب'
]
handler.tags = ['mediator']
handler.command = /^(طلاب|students|مجموعات[_\s]?الطلاب|student[_\s]?groups|رسالة[_\s]?لطالب|dm[_\s]?student|رسالة[_\s]?للطلاب|dm[_\s]?all[_\s]?students|رسالة[_\s]?لمجموعة|dm[_\s]?group|بث[_\s]?للطلاب|اعلان|announce|broadcast[_\s]?students|صندوق[_\s]?الطلاب|student[_\s]?inbox|رد[_\s]?على[_\s]?طالب|reply[_\s]?student|تصفير[_\s]?صندوق|clear[_\s]?inbox|وسيط[_\s]?الطلاب|mediator)$/i

handler.all = captureHandler

export default handler
