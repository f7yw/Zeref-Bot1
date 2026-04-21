/**
 * اختبار 4 أنواع رسائل تفاعلية — لمعرفة أيّها يظهر للمستخدم
 * 1. interactiveMessage / nativeFlowMessage (واتساب الحديث)
 * 2. buttonsMessage  (الصيغة القديمة)
 * 3. listMessage     (قائمة منسدلة كلاسيكية)
 * 4. templateMessage (قوالب واتساب)
 */
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

// ── مساعد إرسال مباشر عبر relayMessage ──────────────────────────────────
async function relay(conn, jid, protoMsgObj, quotedMsg) {
  const msg = generateWAMessageFromContent(
    jid,
    proto.Message.fromObject(protoMsgObj),
    { userJid: conn.user?.id, quoted: quotedMsg }
  )
  await conn.relayMessage(jid, msg.message, { messageId: msg.key.id })
  return msg.key.id
}

// ── النوع 1: interactiveMessage / nativeFlowMessage ─────────────────────
async function sendNativeFlow(conn, jid, quoted) {
  return relay(conn, jid, {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
    },
    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
      body:   { text: '〔1〕 nativeFlow — اختر أمراً:' },
      footer: { text: 'ZEREF · اختبار نوع 1' },
      header: { title: '⚡ nativeFlowMessage', hasMediaAttachment: false },
      nativeFlowMessage: {
        messageParamsJson: '',
        buttons: [
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👤 بروفايل', id: '.بروفايل' }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '💰 رصيد',    id: '.رصيد'    }) },
          {
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: '📋 افتح قائمة',
              sections: [{
                title: 'أوامر',
                rows: [
                  { header: '', title: '🔮 فزوره', description: 'لغز',    id: '.فزوره' },
                  { header: '', title: '📋 اوامر',  description: 'القائمة', id: '.اوامر'  },
                ],
              }],
            }),
          },
        ],
      },
    }),
  }, quoted)
}

// ── النوع 2: buttonsMessage (الصيغة القديمة) ─────────────────────────────
async function sendButtons(conn, jid, quoted) {
  return relay(conn, jid, {
    buttonsMessage: proto.Message.ButtonsMessage.fromObject({
      contentText: '〔2〕 buttonsMessage — اختر:',
      footerText:  'ZEREF · اختبار نوع 2',
      headerType:  1,  // TEXT
      buttons: [
        { buttonId: '.بروفايل', buttonText: { displayText: '👤 بروفايل' }, type: 1 },
        { buttonId: '.رصيد',    buttonText: { displayText: '💰 رصيد'    }, type: 1 },
        { buttonId: '.اوامر',   buttonText: { displayText: '📋 اوامر'   }, type: 1 },
      ],
    }),
  }, quoted)
}

// ── النوع 3: listMessage (قائمة منسدلة) ─────────────────────────────────
async function sendListMsg(conn, jid, quoted) {
  return relay(conn, jid, {
    listMessage: proto.Message.ListMessage.fromObject({
      title:       'ZEREF · اختبار نوع 3',
      description: '〔3〕 listMessage — اختر أمراً:',
      footerText:  'ZEREF',
      listType:    1,       // SINGLE_SELECT
      buttonText:  '📋 افتح القائمة',
      sections: [{
        title: 'الأوامر',
        rows: [
          { title: '👤 بروفايل', rowId: '.بروفايل', description: 'عرض بروفايلك' },
          { title: '💰 رصيد',    rowId: '.رصيد',    description: 'فحص رصيدك'    },
          { title: '🔮 فزوره',   rowId: '.فزوره',   description: 'لعبة لغز'      },
          { title: '📋 اوامر',   rowId: '.اوامر',   description: 'قائمة الأوامر' },
        ],
      }],
    }),
  }, quoted)
}

// ── النوع 4: templateMessage (قوالب واتساب) ─────────────────────────────
async function sendTemplate(conn, jid, quoted) {
  return relay(conn, jid, {
    templateMessage: proto.Message.TemplateMessage.fromObject({
      hydratedTemplate: proto.Message.TemplateMessage.HydratedFourRowTemplate.fromObject({
        hydratedContentText: '〔4〕 templateMessage — اختر:',
        hydratedFooterText:  'ZEREF · اختبار نوع 4',
        hydratedButtons: [
          { quickReplyButton: { displayText: '👤 بروفايل', id: '.بروفايل' } },
          { quickReplyButton: { displayText: '💰 رصيد',    id: '.رصيد'    } },
          { quickReplyButton: { displayText: '📋 اوامر',   id: '.اوامر'   } },
        ],
      }),
    }),
  }, quoted)
}

// ── Handler الرئيسي ────────────────────────────────────────────────────────
const handler = async (m, { conn, command }) => {
  const cmd = command.toLowerCase()

  // أوامر مفردة لاختبار نوع واحد
  if (/نوع1|type1|flow/.test(cmd)) {
    await m.reply('📤 إرسال النوع 1: nativeFlowMessage...')
    try { await sendNativeFlow(conn, m.chat, m); await m.reply('✅ نوع 1 أُرسل') }
    catch (e) { await m.reply(`❌ نوع 1 فشل: ${e?.message}`) }
    return
  }
  if (/نوع2|type2|buttons/.test(cmd)) {
    await m.reply('📤 إرسال النوع 2: buttonsMessage...')
    try { await sendButtons(conn, m.chat, m); await m.reply('✅ نوع 2 أُرسل') }
    catch (e) { await m.reply(`❌ نوع 2 فشل: ${e?.message}`) }
    return
  }
  if (/نوع3|type3|list/.test(cmd)) {
    await m.reply('📤 إرسال النوع 3: listMessage...')
    try { await sendListMsg(conn, m.chat, m); await m.reply('✅ نوع 3 أُرسل') }
    catch (e) { await m.reply(`❌ نوع 3 فشل: ${e?.message}`) }
    return
  }
  if (/نوع4|type4|template/.test(cmd)) {
    await m.reply('📤 إرسال النوع 4: templateMessage...')
    try { await sendTemplate(conn, m.chat, m); await m.reply('✅ نوع 4 أُرسل') }
    catch (e) { await m.reply(`❌ نوع 4 فشل: ${e?.message}`) }
    return
  }

  // اختبار الكل دفعة واحدة
  await m.reply(
`🧪 *اختبار 4 أنواع رسائل تفاعلية*

سيُرسل البوت 4 أنواع مختلفة — أخبرني أيّها ظهر لك:

1️⃣ nativeFlowMessage
2️⃣ buttonsMessage
3️⃣ listMessage
4️⃣ templateMessage

📤 جاري الإرسال...`
  )

  const results = []
  const tests = [
    ['نوع 1 (nativeFlow)',  () => sendNativeFlow(conn, m.chat, m)],
    ['نوع 2 (buttons)',     () => sendButtons(conn, m.chat, m)],
    ['نوع 3 (list)',        () => sendListMsg(conn, m.chat, m)],
    ['نوع 4 (template)',    () => sendTemplate(conn, m.chat, m)],
  ]

  for (const [label, fn] of tests) {
    try {
      await fn()
      results.push(`✅ ${label} — أُرسل`)
      console.log(`[TEST-INTERACTIVE] ✅ ${label}`)
    } catch (e) {
      results.push(`❌ ${label} — فشل: ${e?.message?.slice(0, 60)}`)
      console.error(`[TEST-INTERACTIVE] ❌ ${label}:`, e?.message)
    }
    await new Promise(r => setTimeout(r, 800))  // تأخير بسيط بين الرسائل
  }

  await m.reply(
`📊 *نتيجة الاختبار:*\n\n${results.join('\n')}\n\nأخبرني أيّ الأنواع ظهر لك بالأزرار/القائمة!`
  )
}

handler.help = ['اختبار_تفاعلي']
handler.tags = ['owner']
handler.command = /^(اختبار_تفاعلي|اختبار_ازرار|اختبار_قائمة|test_buttons|test_list|test_flow|test_interactive|نوع[1-4]|type[1-4])$/i

export default handler
