// ─── سباق الكلمات: فكك / رتب ─────────────────────────────────────────────────
// لعبتان جماعيتان تنافسيتان بثلاث مستويات (سهل/متوسط/صعب)
// الفائز هو أول من يكتب الإجابة الصحيحة في المحادثة.
// ──────────────────────────────────────────────────────────────────────────────

import { initEconomy, logTransaction, fmt } from '../lib/economy.js'

const BANK = {
  unscramble: {
    سهل: [
      { hint: '🍎 فاكهة حمراء شائعة', answer: 'تفاح' },
      { hint: '🐱 حيوان أليف يموء', answer: 'قطة' },
      { hint: '☀️ يضيء النهار', answer: 'شمس' },
      { hint: '🌙 يضيء الليل', answer: 'قمر' },
      { hint: '🚗 وسيلة نقل بأربع عجلات', answer: 'سيارة' },
      { hint: '✈️ يطير في السماء', answer: 'طائرة' },
      { hint: '🌊 مسطح مائي مالح', answer: 'بحر' },
      { hint: '🍞 طعام أساسي يومي', answer: 'خبز' },
      { hint: '🌹 أجمل زهرة عطرية', answer: 'وردة' },
      { hint: '🐟 يعيش في الماء', answer: 'سمكة' },
      { hint: '🌳 نبات كبير له جذع', answer: 'شجرة' },
      { hint: '🔑 يفتح الأبواب', answer: 'مفتاح' },
    ],
    متوسط: [
      { hint: '🏛️ مبنى للتعلم العالي', answer: 'جامعة' },
      { hint: '🔬 علم المواد والذرات', answer: 'كيمياء' },
      { hint: '💻 جهاز للحوسبة الإلكترونية', answer: 'حاسوب' },
      { hint: '📱 جهاز اتصال محمول', answer: 'هاتف' },
      { hint: '🕌 بيت العبادة للمسلمين', answer: 'مسجد' },
      { hint: '📖 كلام الله المنزل', answer: 'القرآن' },
      { hint: '🦁 ملك الغابة', answer: 'أسد' },
      { hint: '🏥 مكان لعلاج المرضى', answer: 'مستشفى' },
      { hint: '⚓ أداة لتثبيت السفينة', answer: 'مرساة' },
      { hint: '📚 مكان لاستعارة الكتب', answer: 'مكتبة' },
      { hint: '🌋 جبل تخرج منه الحمم', answer: 'بركان' },
      { hint: '🎓 من يدرس في الجامعة', answer: 'طالب' },
    ],
    صعب: [
      { hint: '🧬 علم الوراثة والكروموسومات', answer: 'الجينات' },
      { hint: '🌌 علم النجوم والكواكب', answer: 'الفلك' },
      { hint: '⚖️ علم الأحكام الشرعية', answer: 'الفقه' },
      { hint: '🏔️ أعلى قمة في العالم', answer: 'إيفرست' },
      { hint: '🔭 جهاز لرؤية الأجرام البعيدة', answer: 'تلسكوب' },
      { hint: '🎻 آلة موسيقية وترية كلاسيكية', answer: 'كمان' },
      { hint: '⚛️ أصغر وحدة في العنصر', answer: 'الذرة' },
      { hint: '🧠 علم النفس والسلوك', answer: 'سيكولوجيا' },
      { hint: '🐉 كائن أسطوري ينفث النار', answer: 'تنين' },
      { hint: '🗺️ علم الخرائط والأرض', answer: 'جغرافيا' },
      { hint: '🏺 علم الآثار والحفريات', answer: 'الأركيولوجيا' },
      { hint: '🎭 فن التمثيل المسرحي', answer: 'الدراما' },
    ],
  },
  arrange: {
    سهل: ['قمر','شمس','بحر','جبل','وردة','زهرة','كتاب','قلم','باب','ليل','نهار','حصان','تفاح','عنب','ورد','سحاب','نار','ماء'],
    متوسط: ['جامعة','مكتبة','حاسوب','طائرة','سيارة','مسجد','مدرسة','هاتف','شجرة','نجمة','صحراء','مطار','رياضة','حديقة','مستشفى','عاصفة','نسيم','قمري','نهري'],
    صعب: ['كروموسوم','تلسكوب','ديناصور','استراتيجية','فلسفة','جغرافيا','اقتصاد','هندسة','بيولوجيا','الديمقراطية','الإمبراطورية','الأركيولوجيا','الميتافيزيقا','إلكترونيات','رياضيات'],
  },
}

const REWARDS = {
  سهل:    { xp: 30,  money: 50  },
  متوسط:  { xp: 60,  money: 120 },
  صعب:    { xp: 130, money: 300 },
}
const TIMEOUT_MS = 90 * 1000   // 90 ثانية لكل جولة

function shuffleLetters(word) {
  const arr = [...word]
  if (arr.length < 2) return word
  let result, tries = 0
  do {
    result = [...arr].sort(() => Math.random() - 0.5)
    tries++
  } while (result.join('') === word && tries < 8)
  return result.join(' - ')
}

function pickLevel(args) {
  const a = (args[0] || '').toString().toLowerCase()
  if (/^(easy|سهل)$/i.test(a))    return 'سهل'
  if (/^(hard|صعب)$/i.test(a))    return 'صعب'
  if (/^(medium|متوسط|وسط)$/i.test(a)) return 'متوسط'
  return 'متوسط'
}

// تطبيع الإجابة: تجاهل الفروق الإملائية البسيطة (همزات/تاء مربوطة/ياء)
function normalize(s) {
  return String(s || '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ـ\u064B-\u0652]/g, '') // تشكيل
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase()
}

global.wordRaces = global.wordRaces || {}

let handler = async (m, { conn, command, args }) => {
  const chat = m.chat
  if (global.wordRaces[chat]) {
    return m.reply(
`╭────『 ⚠️ لعبة جارية 』────
│
│ توجد جولة كلمات نشطة في هذه المحادثة.
│ ⏱️ انتظر حتى تنتهي،
│ ❌ أو اكتب: *الغاء_اللعبة*
│
╰──────────────────`)
  }

  const level = pickLevel(args)
  let header, scrambledLine, answer

  if (/^فكك$/i.test(command)) {
    const pool = BANK.unscramble[level]
    const item = pool[Math.floor(Math.random() * pool.length)]
    answer = item.answer
    header = '🧩 فكك الكلمة'
    scrambledLine = `🔍 الدليل: *${item.hint}*\n│ 📏 عدد الحروف: *${[...answer].length}*`
  } else if (/^رتب$/i.test(command)) {
    const pool = BANK.arrange[level]
    answer = pool[Math.floor(Math.random() * pool.length)]
    header = '🔤 رتب الكلمة'
    scrambledLine = `🔀 الحروف: *${shuffleLetters(answer)}*`
  } else {
    return
  }

  const reward    = REWARDS[level]
  const startedAt = Date.now()

  const text =
`╭────『 ${header} 』────
│
│ 🎯 المستوى: *${level}*
│ ⏱️ الوقت: *90 ثانية*
│
│ ${scrambledLine}
│
│ 🏆 الفائز: *أول من يجيب صحيحاً*
│ 🎁 الجائزة: *${reward.xp} XP + ${fmt(reward.money)}*
│
│ 💡 اكتب الإجابة مباشرة في المحادثة
│ ❌ للإلغاء: *الغاء_اللعبة*
│
╰──────────────────`

  const sent = await m.reply(text)

  global.wordRaces[chat] = {
    type: command.toLowerCase(),
    level,
    answer,
    answerNorm: normalize(answer),
    reward,
    startedAt,
    msgId: sent?.key?.id,
  }

  global.wordRaces[chat].timer = setTimeout(async () => {
    const g = global.wordRaces[chat]
    if (!g || g.startedAt !== startedAt) return
    delete global.wordRaces[chat]
    try {
      await conn.sendMessage(chat, {
        text:
`╭────『 ⏰ انتهى الوقت 』────
│
│ ❌ لم يتمكن أحد من الإجابة!
│ ✅ الكلمة الصحيحة: *${answer}*
│ 🎯 المستوى: *${level}*
│
╰──────────────────`
      })
    } catch {}
  }, TIMEOUT_MS)
}

// كاشف الإجابات: يعمل على كل رسالة في المحادثة
handler.before = async function (m) {
  const chat = m?.chat
  if (!chat) return
  const game = global.wordRaces?.[chat]
  if (!game) return
  if (m.isBaileys) return

  const text = (m.text || '').trim()
  if (!text) return

  // إلغاء صريح
  if (/^الغاء_اللعبة$/i.test(text)) {
    if (game.timer) clearTimeout(game.timer)
    delete global.wordRaces[chat]
    await this.reply(chat,
`╭────『 🛑 ألغيت اللعبة 』────
│
│ ✅ الكلمة كانت: *${game.answer}*
│
╰──────────────────`, m)
    return true
  }

  // تجاهل الأوامر
  if (/^[./#!]/.test(text)) return
  if (global.prefix?.test?.(text)) return

  // فحص الإجابة
  if (normalize(text) !== game.answerNorm) return

  // فوز
  if (game.timer) clearTimeout(game.timer)
  delete global.wordRaces[chat]

  const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  initEconomy(user)
  user.exp         = (user.exp || 0) + game.reward.xp
  user.money       = (user.money || 0) + game.reward.money
  user.totalEarned = (user.totalEarned || 0) + game.reward.money
  user.wordRaceWins = (user.wordRaceWins || 0) + 1
  logTransaction(user, 'earn', game.reward.money, `🏆 فوز ${game.type} (${game.level})`)
  global.markDirty?.()

  const elapsed = ((Date.now() - game.startedAt) / 1000).toFixed(1)
  await this.reply(chat,
`╭────『 🏆 فائز! 』────
│
│ 🎉 مبروك @${m.sender.split('@')[0]}!
│ ✅ الإجابة: *${game.answer}*
│ ⏱️ الوقت المستغرق: *${elapsed}ث*
│ 🎯 المستوى: *${game.level}*
│
│ 🎁 ربحت: *${game.reward.xp} XP + ${fmt(game.reward.money)}*
│ 💼 رصيدك: *${fmt(user.money)}*
│ 🏅 إجمالي انتصاراتك: *${user.wordRaceWins}*
│
╰──────────────────`,
    m, { mentions: [m.sender] }
  )
  return true
}

handler.help    = ['فكك [سهل|متوسط|صعب]', 'رتب [سهل|متوسط|صعب]']
handler.tags    = ['game']
handler.command = /^(فكك|رتب)$/i

export default handler
