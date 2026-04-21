/**
 * اختبار 5 أنواع رسائل تفاعلية — لمعرفة أيّها يُظهر الأزرار فعلاً
 */
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

// ── مساعد relay مشترك ────────────────────────────────────────────────────
async function relay(conn, jid, protoMsgObj, quotedMsg) {
  const msg = generateWAMessageFromContent(
    jid,
    proto.Message.fromObject(protoMsgObj),
    { userJid: conn.user?.id, quoted: quotedMsg }
  )
  await conn.relayMessage(jid, msg.message, { messageId: msg.key.id })
  return msg.key.id
}

// ── النوع 1: interactiveMessage بدون viewOnce ────────────────────────────
async function type1_plainInteractive(conn, jid, quoted) {
  return relay(conn, jid, {
    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
      body:   { text: '〔1〕 interactiveMessage بدون viewOnce' },
      footer: { text: 'ZEREF · نوع 1' },
      header: { title: '⚡ نوع 1', hasMediaAttachment: false },
      nativeFlowMessage: {
        messageParamsJson: '',
        buttons: [
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👤 بروفايل', id: '.بروفايل' }) },
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '💰 رصيد',    id: '.رصيد'    }) },
        ],
      },
    }),
  }, quoted)
}

// ── النوع 2: interactiveMessage + viewOnceMessage wrapper ────────────────
async function type2_viewOnceInteractive(conn, jid, quoted) {
  return relay(conn, jid, {
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          body:   { text: '〔2〕 interactiveMessage داخل viewOnce' },
          footer: { text: 'ZEREF · نوع 2' },
          header: { title: '⚡ نوع 2', hasMediaAttachment: false },
          nativeFlowMessage: {
            messageParamsJson: '',
            buttons: [
              { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👤 بروفايل', id: '.بروفايل' }) },
              { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '💰 رصيد',    id: '.رصيد'    }) },
            ],
          },
        }),
      },
    },
  }, quoted)
}

// ── النوع 3: buttonsMessage (الصيغة القديمة) ────────────────────────────
async function type3_buttons(conn, jid, quoted) {
  return relay(conn, jid, {
    buttonsMessage: proto.Message.ButtonsMessage.fromObject({
      contentText: '〔3〕 buttonsMessage كلاسيكي',
      footerText:  'ZEREF · نوع 3',
      headerType:  1,
      buttons: [
        { buttonId: '.بروفايل', buttonText: { displayText: '👤 بروفايل' }, type: 1 },
        { buttonId: '.رصيد',    buttonText: { displayText: '💰 رصيد'    }, type: 1 },
        { buttonId: '.اوامر',   buttonText: { displayText: '📋 اوامر'   }, type: 1 },
      ],
    }),
  }, quoted)
}

// ── النوع 4: listMessage (قائمة منسدلة) ─────────────────────────────────
async function type4_list(conn, jid, quoted) {
  return relay(conn, jid, {
    listMessage: proto.Message.ListMessage.fromObject({
      title:       '⚡ نوع 4',
      description: '〔4〕 listMessage كلاسيكي',
      footerText:  'ZEREF · نوع 4',
      listType:    1,
      buttonText:  '📋 افتح القائمة',
      sections: [{
        title: 'أوامر',
        rows: [
          { title: '👤 بروفايل', rowId: '.بروفايل', description: 'بروفايلك' },
          { title: '💰 رصيد',    rowId: '.رصيد',    description: 'رصيدك'    },
          { title: '🔮 فزوره',   rowId: '.فزوره',   description: 'لغز'       },
        ],
      }],
    }),
  }, quoted)
}

// ── النوع 5: templateMessage / hydratedTemplate ──────────────────────────
async function type5_template(conn, jid, quoted) {
  return relay(conn, jid, {
    templateMessage: proto.Message.TemplateMessage.fromObject({
      hydratedTemplate: proto.Message.TemplateMessage.HydratedFourRowTemplate.fromObject({
        hydratedContentText: '〔5〕 templateMessage hydratedTemplate',
        hydratedFooterText:  'ZEREF · نوع 5',
        hydratedButtons: [
          { quickReplyButton: { displayText: '👤 بروفايل', id: '.بروفايل' } },
          { quickReplyButton: { displayText: '💰 رصيد',    id: '.رصيد'    } },
          { quickReplyButton: { displayText: '📋 اوامر',   id: '.اوامر'   } },
        ],
      }),
    }),
  }, quoted)
}

// ── Handler ───────────────────────────────────────────────────────────────
const handler = async (m, { conn }) => {
  await m.reply(
`🧪 *اختبار 5 أنواع رسائل تفاعلية*

سيُرسل البوت 5 رسائل — كل رسالة مُرقّمة 〔1〕 حتى 〔5〕
أخبرني أيّها ظهرت بأزرار أو قائمة ✅

📤 جاري الإرسال...`
  )

  const types = [
    ['نوع 1 — interactiveMessage بدون viewOnce',       type1_plainInteractive ],
    ['نوع 2 — interactiveMessage داخل viewOnce',       type2_viewOnceInteractive],
    ['نوع 3 — buttonsMessage كلاسيكي',                 type3_buttons          ],
    ['نوع 4 — listMessage كلاسيكي',                    type4_list             ],
    ['نوع 5 — templateMessage/hydratedTemplate',        type5_template         ],
  ]

  const results = []
  for (const [label, fn] of types) {
    try {
      await fn(conn, m.chat, m)
      results.push(`✅ ${label}`)
      console.log(`[TEST] ✅ ${label}`)
    } catch (e) {
      results.push(`❌ ${label}\n   → ${e?.message?.slice(0, 80)}`)
      console.error(`[TEST] ❌ ${label}:`, e?.message)
    }
    await new Promise(r => setTimeout(r, 700))
  }

  await m.reply(
`📊 *نتيجة الإرسال:*

${results.join('\n')}

⬆️ أيّ رسالة ظهرت لك بأزرار/قائمة؟`
  )
}

handler.help = ['اختبار_تفاعلي']
handler.tags = ['owner']
handler.command = /^(اختبار_تفاعلي|اختبار_ازرار|اختبار_قائمة|test_buttons|test_list|test_interactive)$/i

export default handler
