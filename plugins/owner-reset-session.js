/**
 * .مسح_الجلسة — أمر للمطور فقط لمسح جلسة WhatsApp وإعادة الإقران.
 *
 *  الخطوات:
 *  1. يرسل تنبيهاً للمطور بأن إعادة الإقران ستبدأ.
 *  2. يكتب علم "pendingPairing" في قاعدة البيانات + يحفظ jid المطور.
 *  3. يحذف مجلد الجلسة (Zeref/) ويعيد تشغيل العملية.
 *  4. عند بدء التشغيل التالي يولّد main.js كود إقران جديد، ثم:
 *      • يكتبه إلى tmp/pairing-code.txt
 *      • يعرضه عبر السيرفر على /pairing-code
 *      • بعد نجاح الاتصال يرسل تأكيداً للمطور.
 */
import { rmSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolvePhoneJid } from '../lib/jidUtils.js'

let handler = async (m, { conn, usedPrefix, command, args }) => {
  // تأكيد إضافي للحماية من المسح بالخطأ
  if ((args[0] || '').toLowerCase() !== 'تأكيد' && (args[0] || '').toLowerCase() !== 'confirm') {
    return m.reply(
`⚠️ *تحذير: مسح الجلسة سيقطع اتصال البوت*

سيتم:
• حذف ملفات جلسة WhatsApp بالكامل
• إعادة تشغيل البوت
• توليد كود إقران جديد

🔐 الكود الجديد سيكون متاحاً في:
  • Console
  • الرابط: /pairing-code
  • ملف tmp/pairing-code.txt
  • سيُرسَل تأكيد لك خاص فور إتمام الربط

📌 للتأكيد، أرسل:
*${usedPrefix}${command} تأكيد*`)
  }

  const senderJid = resolvePhoneJid(m.sender)

  // سجل المطور المُستهدَف بالإشعار في DB ليُستخدم بعد إعادة التشغيل
  try {
    global.db.data.settings ??= {}
    global.db.data.settings.pendingPairing = {
      requestedBy: senderJid,
      requestedAt: Date.now()
    }
    await global.db.write?.().catch(() => {})
  } catch (_) {}

  await m.reply(
`🔄 *جارٍ مسح الجلسة...*

سيُعاد تشغيل البوت خلال ثوانٍ، ثم سيُولَّد كود إقران جديد.

📋 ستجد الكود في:
  1️⃣ /pairing-code (واجهة المتصفح)
  2️⃣ ملف: tmp/pairing-code.txt
  3️⃣ Console الخادم

✅ سأرسل لك تأكيداً هنا فور اكتمال الربط الجديد.`)

  // امنح وقتاً قصيراً لإرسال الرد ثم احذف الجلسة + أعد التشغيل
  setTimeout(async () => {
    try {
      try { await global.saveDatabase?.() } catch (_) {}
      const authPath = `./${global.authFile || 'Zeref'}`
      if (existsSync(authPath)) rmSync(authPath, { recursive: true, force: true })

      // امسح أي كود قديم
      try {
        if (!existsSync('./tmp')) mkdirSync('./tmp', { recursive: true })
        writeFileSync('./tmp/pairing-code.txt', '⏳ جارٍ توليد كود جديد...')
      } catch (_) {}

      console.log('[RESET] تم مسح الجلسة بأمر من المطور — إعادة التشغيل...')
    } catch (e) {
      console.error('[RESET] خطأ:', e?.message)
    } finally {
      process.exit(0) // index.js سيعيد تشغيل العملية تلقائياً
    }
  }, 1500)
}

handler.help    = ['مسح_الجلسة']
handler.tags    = ['owner']
handler.command = /^(مسح_الجلسة|مسح_الجلسه|reset_session|resetsession)$/i
handler.rowner  = true   // المطور الحقيقي فقط
handler.owner   = true

export default handler
