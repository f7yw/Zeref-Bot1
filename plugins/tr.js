import pkg from '@vitalets/google-translate-api'
const { translate } = pkg
import { typingDelay } from '../lib/presence.js'

const defaultLang = 'ar'

const LANG_MAP = {
  ar: 'عربي', en: 'إنجليزي', fr: 'فرنسي', tr: 'تركي',
  es: 'إسباني', de: 'ألماني', zh: 'صيني', ru: 'روسي',
  ja: 'ياباني', ko: 'كوري', it: 'إيطالي', pt: 'برتغالي',
  fa: 'فارسي', hi: 'هندي', ur: 'أردو', id: 'إندونيسي',
  nl: 'هولندي', sv: 'سويدي', pl: 'بولندي', th: 'تايلاندي'
}

const VALID_LANGS = new Set(Object.keys(LANG_MAP))

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const usageMsg =
`╭────『 🌍 الترجمة 』────
│
│ 📌 *الاستخدام:*
│ ${usedPrefix}${command} en مرحبا كيف حالك
│ ${usedPrefix}${command} ar Hello world
│ (أو رد على رسالة + ${usedPrefix}${command} en)
│
│ 🌐 *رموز اللغات:*
│ ar عربي │ en إنجليزي │ fr فرنسي
│ tr تركي │ es إسباني │ de ألماني
│ zh صيني │ ru روسي │ ja ياباني
│ ko كوري │ it إيطالي │ pt برتغالي
│ fa فارسي │ hi هندي │ ur أردو
╰──────────────────`.trim()

  let lang = (args[0] || '').trim().toLowerCase()
  let text = args.slice(1).join(' ').trim()

  if (!lang || !VALID_LANGS.has(lang)) {
    if (lang && !VALID_LANGS.has(lang)) {
      text = args.join(' ')
      lang = defaultLang
    } else {
      throw usageMsg
    }
  }

  if (!text && m.quoted?.text) text = m.quoted.text
  if (!text) throw usageMsg

  await typingDelay(conn, m.chat, 1000)

  try {
    const result = await translate(text, { to: lang })
    const langName = LANG_MAP[lang] || lang
    await m.reply(
      `╭────『 🌍 الترجمة 』────\n│\n│ 🔤 *النص:*\n│ ${text.slice(0, 300)}\n│\n│ 🌐 *الترجمة إلى ${langName}:*\n│ ${result.text}\n│\n╰──────────────────`.trim()
    )
  } catch (e) {
    console.error('[TR ERROR]', e?.message || e)
    throw `❌ فشل الترجمة — حاول مرة أخرى لاحقاً\n\n${usageMsg}`
  }
}

handler.help = ['ترجم en النص']
handler.tags = ['tools']
handler.command = /^(ترجم|ترجمه|translate|tr)$/i
export default handler
