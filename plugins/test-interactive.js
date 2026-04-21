/**
 * اختبار الردود التفاعلية — يجرّب 3 طرق إرسال لإيجاد الأنسب
 * - nativeFlowMessage (الأحدث - واتساب +2.23)
 * - listMessage      (القديم  - الأكثر توافقاً)
 * - quick_reply buttons
 */
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

// ── الطريقة 1: nativeFlowMessage (Baileys الحديث) ─────────────────────────
async function sendNativeFlow(conn, jid, quotedMsg) {
  const interactiveMsg = {
    body:   { text: '🧪 اختر أمراً من الأزرار أو القائمة:' },
    footer: { text: 'ZEREF · اختبار تفاعلي' },
    header: { title: '⚡ اختبار الأزرار', hasMediaAttachment: false },
    nativeFlowMessage: {
      messageParamsJson: '',
      buttons: [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({ display_text: '👤 بروفايل', id: '.بروفايل' }),
        },
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({ display_text: '💰 رصيد', id: '.رصيد' }),
        },
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: '📋 افتح القائمة',
            sections: [
              {
                title: 'اختر أمراً',
                rows: [
                  { header: '', title: '🔮 فزوره',   description: 'لعبة لغز', id: '.فزوره' },
                  { header: '', title: '📋 الأوامر', description: 'قائمة الأوامر', id: '.اوامر' },
                  { header: '', title: '🃏 حظ',       description: 'حظك اليوم', id: '.حظ' },
                ],
              },
            ],
          }),
        },
      ],
    },
  }

  // المشكلة الأساسية: يجب تغليف كل شيء بـ proto.Message.fromObject لضمان التشفير الصحيح
  const msgContent = proto.Message.fromObject({
    messageContextInfo: {
      deviceListMetadata:        {},
      deviceListMetadataVersion: 2,
    },
    interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactiveMsg),
  })

  const msg = generateWAMessageFromContent(jid, msgContent, {
    userJid: conn.user?.id,
    quoted:  quotedMsg,
  })

  await conn.relayMessage(jid, msg.message, { messageId: msg.key.id })
  return 'nativeFlow'
}

// ── الطريقة 2: listMessage الكلاسيكي (أكثر توافقاً) ─────────────────────
async function sendListMessage(conn, jid, quotedMsg) {
  await conn.sendMessage(jid, {
    text:       '🧪 اختر أمراً من القائمة (النوع الكلاسيكي):',
    footer:     'ZEREF · اختبار قائمة',
    title:      '⚡ قائمة اختبار',
    buttonText: '📋 افتح القائمة',
    sections: [
      {
        title: 'الأوامر المتاحة',
        rows: [
          { title: '👤 بروفايل',  rowId: '.بروفايل',  description: 'عرض بروفايلك' },
          { title: '💰 رصيد',     rowId: '.رصيد',     description: 'فحص رصيدك' },
          { title: '🔮 فزوره',    rowId: '.فزوره',    description: 'لعبة لغز' },
          { title: '📋 الأوامر',  rowId: '.اوامر',    description: 'قائمة كل الأوامر' },
        ],
      },
    ],
  }, { quoted: quotedMsg })
  return 'list'
}

// ── Handler الرئيسي ────────────────────────────────────────────────────────
const handler = async (m, { conn, command }) => {
  const isListOnly  = /list|قائمة_فقط/.test(command)
  const isFlowOnly  = /flow|ازرار_فقط/.test(command)

  await m.reply(`🧪 *اختبار الردود التفاعلية*\n\n📤 جاري إرسال الرسالة التفاعلية...`)

  // ── اختبار nativeFlowMessage ──────────────────────────────────────
  if (!isListOnly) {
    try {
      await sendNativeFlow(conn, m.chat, m)
      console.log('[TEST-INTERACTIVE] ✅ nativeFlow أُرسل بنجاح إلى', m.chat)
      await m.reply(
`✅ *تم إرسال رسالة الأزرار التفاعلية (nativeFlow)*

إذا لم تظهر الأزرار:
• تأكد أن واتساب محدَّث لآخر إصدار
• بعض إصدارات واتساب لا تعرض الأزرار`
      )
    } catch (e) {
      console.error('[TEST-INTERACTIVE] ❌ فشل nativeFlow:', e?.message || e)
      await m.reply(`⚠️ *فشل إرسال nativeFlow*\nالسبب: \`${e?.message || e}\`\n\nجرّب القائمة الكلاسيكية بالأمر: *.اختبار_قائمة*`)
    }
  }

  // ── اختبار listMessage ────────────────────────────────────────────
  if (!isFlowOnly) {
    try {
      await sendListMessage(conn, m.chat, m)
      console.log('[TEST-INTERACTIVE] ✅ listMessage أُرسل بنجاح')
    } catch (e) {
      console.error('[TEST-INTERACTIVE] ❌ فشل listMessage:', e?.message || e)
      await m.reply(`❌ فشل إرسال القائمة الكلاسيكية أيضاً\nالسبب: \`${e?.message || e}\``)
    }
  }
}

handler.help = ['اختبار_تفاعلي']
handler.tags = ['owner']
handler.command = /^(اختبار_تفاعلي|اختبار_ازرار|اختبار_قائمة|اختبار_قائمة_فقط|اختبار_ازرار_فقط|test_buttons|test_list|test_flow)$/i

export default handler
