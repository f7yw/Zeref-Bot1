// ─── إعدادات الكتابة التلقائية للبوت ─────────────────────────────────────────
// يتحكّم بالردود التلقائية في شات.js (التي تنطلق على كلمات مثل "بوت"، "تحبني"، إلخ).
// يدعم وضعين:
//   • مستوى المحادثة: chat.autoReply  (افتراضي مفعّل)
//   • مستوى البوت كله: settings[botJid].autoChatGlobal  (افتراضي مفعّل)
// إذا أُوقف العام → يتوقّف في كل المحادثات حتى لو كانت مفعّلة محلياً.
// ─────────────────────────────────────────────────────────────────────────────

let handler = async (m, { conn, args, command, isAdmin, isOwner, isROwner }) => {
  const sub = (args[0] || '').toLowerCase().trim()
  const botJid = conn?.user?.jid || conn?.user?.id || 'main'

  global.db.data.settings = global.db.data.settings || {}
  const s = global.db.data.settings[botJid] = global.db.data.settings[botJid] || {}
  if (typeof s.autoChatGlobal !== 'boolean') s.autoChatGlobal = true

  const chat = global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || {}
  if (typeof chat.autoReply !== 'boolean') chat.autoReply = true

  const isGlobalSub = /^(عام|all|كل|global)$/i.test(sub)
  const action = isGlobalSub ? (args[1] || '').toLowerCase().trim() : sub

  // ── تبديل عام (للمطور فقط) ──
  if (isGlobalSub) {
    if (!isROwner && !isOwner) {
      return m.reply(
`╭────『 🛡️ صلاحيات غير كافية 』────
│
│ التبديل العام يخصّ المطور فقط.
│ يمكنك التحكّم بمحادثتك الحالية:
│ • .${command} تشغيل
│ • .${command} ايقاف
│
╰──────────────────`)
    }
    if (/^(تشغيل|on|نعم|فعل)$/i.test(action)) {
      s.autoChatGlobal = true
      global.markDirty?.()
      return m.reply(box('🔊 تشغيل الكتابة عاماً', [
        '✅ تم تفعيل الردود التلقائية على مستوى البوت كله.',
        'كل محادثة تتحكم بنفسها بشكل منفصل.',
      ]))
    }
    if (/^(ايقاف|إيقاف|off|تعطيل|اطفاء)$/i.test(action)) {
      s.autoChatGlobal = false
      global.markDirty?.()
      return m.reply(box('🔇 إيقاف الكتابة عاماً', [
        '⛔ توقّفت الردود التلقائية في *جميع* المحادثات.',
        'لن يكتب البوت من نفسه حتى لو كانت المحادثة مفعّلة.',
      ]))
    }
    return m.reply(box('⚙️ التبديل العام', [
      `🔘 الحالة العامة: *${s.autoChatGlobal ? '✅ مفعَّلة' : '⛔ متوقفة'}*`,
      '',
      'الاستخدام:',
      `• .${command} عام تشغيل`,
      `• .${command} عام ايقاف`,
    ]))
  }

  // ── تبديل المحادثة (للمشرف/المطور) ──
  if (m.isGroup && !isAdmin && !isROwner && !isOwner) {
    return m.reply(
`╭────『 🛡️ صلاحيات غير كافية 』────
│
│ تغيير إعداد المحادثة للمشرفين فقط.
│ استخدم: .${command} حالة لرؤية الإعداد.
│
╰──────────────────`)
  }

  if (/^(تشغيل|on|نعم|فعل)$/i.test(action)) {
    chat.autoReply = true
    global.markDirty?.()
    return m.reply(box('🔊 تشغيل في هذه المحادثة', [
      '✅ سيردّ البوت تلقائياً على بعض الكلمات هنا.',
      s.autoChatGlobal ? '' : '⚠️ التبديل العام متوقّف — لن يعمل حتى يُفعَّل عاماً.',
    ].filter(Boolean)))
  }

  if (/^(ايقاف|إيقاف|off|تعطيل|اطفاء|اخرس)$/i.test(action)) {
    chat.autoReply = false
    global.markDirty?.()
    return m.reply(box('🔇 إيقاف في هذه المحادثة', [
      '⛔ لن يكتب البوت تلقائياً في هذه المحادثة.',
      'الأوامر العادية تعمل كالمعتاد.',
    ]))
  }

  // ── عرض الحالة (افتراضي) ──
  return m.reply(box('💬 إعدادات كتابة البوت', [
    `🌐 الحالة العامة:    *${s.autoChatGlobal ? '✅ مفعَّلة' : '⛔ متوقفة'}*`,
    `💭 هذه المحادثة:     *${chat.autoReply ? '✅ مفعَّلة' : '⛔ متوقفة'}*`,
    '',
    `🔎 النتيجة الفعلية: *${(s.autoChatGlobal && chat.autoReply) ? '✅ يكتب' : '⛔ صامت'}*`,
    '',
    '⚙️ التحكّم:',
    `• .${command} تشغيل           — لهذه المحادثة`,
    `• .${command} ايقاف           — لهذه المحادثة`,
    `• .${command} عام تشغيل       — للبوت كله (مطور)`,
    `• .${command} عام ايقاف       — للبوت كله (مطور)`,
  ]))
}

function box(title, lines) {
  return `╭────『 ${title} 』────\n│\n│ ${lines.join('\n│ ')}\n│\n╰──────────────────`
}

handler.help    = ['كتابة_البوت [تشغيل|ايقاف|عام تشغيل|عام ايقاف]']
handler.tags    = ['owner', 'group']
handler.command = /^(كتابة_البوت|كتابه_البوت|الكتابة|الكتابه|كتابة|كتابه|ردود_تلقائية|ردود_تلقائيه|الردود_التلقائية|الردود_التلقائيه|auto_chat|autochat|silent_bot)$/i

export default handler
