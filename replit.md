# Zeref - SHADOW WhatsApp Bot

## Overview
Arabic WhatsApp bot built with Node.js and Baileys. The bot is focused on useful group/community features: study support, games, economy, group administration, media downloads, productivity tools, analytics, safety/privacy, developer helpers, wellness prompts, global auto-translation, profile/status tools, and preserved automatic chat responses.

## Owner / Config
- **Owner number:** 967778088098
- **GitHub:** https://github.com/farisatif
- **Bot name:** 彡ℤ𝕖𝕣𝕖𝕗 / SHADOW Bot
- **Prefix:** `.` and other prefixes from `global.prefix`

## Tech Stack
- **Runtime:** Node.js ES Modules
- **WhatsApp:** `@whiskeysockets/baileys`
- **Database:** Lowdb JSON in `database.json`, auto-saved every 30 seconds, after handled messages, and on shutdown/disconnect
- **Server:** Express on port 3000

## Architecture
- `index.js` starts the app and Express server.
- `main.js` initializes WhatsApp, loads database, binds message/group events, and loads plugins.
- `handler.js` routes commands, applies permissions, XP/money, and bot status gating.
- `plugins/menu.js` contains the numbered menu sections.
- `plugins/general-sections.js` contains productivity, analytics, safety, developer, media helper, and wellness commands.
- `plugins/study.js` contains student learning commands.
- `plugins/study-games.js` contains lightweight educational games.
- `plugins/شات.js` preserves automatic chat responses.

## Current Focus
The bot is being trimmed toward a useful student/community assistant. Unrelated entertainment/media commands are excluded from plugin loading in `main.js`, while games and auto-response remain active.

## Menu Sections
1. 🎓 التعلم والدراسة — plans, summaries, flashcards, quizzes, GPA, study rules, Pomodoro, sources, daily schedule
2. 📖 القرآن الكريم — adhkar and Quran commands
3. 🤖 الذكاء الاصطناعي — AI chat/image quality where configured
4. 🎮 الألعاب — quiz, math, chess, tic-tac-toe, dice, coin, RPS, educational games
5. 🛠️ أدوات نافعة — global translator, reminders, alarm, QR
6. 💰 الاقتصاد — bank, deposit, withdraw, transfer, work, daily reward, energy
7. 👤 الحساب والمعلومات — profile with picture and full saved information, bot status, time, report, owner
8. 🎧 الوسائط والتحميل — songs as audio/video, YouTube search, video download
9. 📌 الإنتاجية والتنظيم — tasks and notes
10. 📊 التحليل والإحصاءات — user stats, leaderboard, group activity, plugin usage
11. 🛡️ السلامة والخصوصية — link checks, privacy tips, group safety rules
12. 💻 البرمجة والمطور — code formatting, JSON formatting, regex testing
13. 🌱 الصحة والعادات — water, breathing, and smart break prompts
14. 👥 إدارة القروب — name/description, kick/add, promote/demote, lock/open, mentions, anti-link
15. 👑 أوامر المالك — bot control and moderation
16. 📜 كل الأقسام — combined section view

## Study Commands
- `.تعلم` — shows the study section help
- `.خطة رياضيات 7` — study plan by subject and days
- `.تلخيص <نص>` — quick local summary
- `.بطاقات <نص>` — flashcards from notes
- `.اختبرني فيزياء` — quick self-test question
- `.معدلي 90 85 77` — approximate average/grade
- `.قاعدة` — useful study rule
- `.بومودورو` — focus method
- `.مصادر` — recommended study resources
- `.جدول` — short daily study schedule

## Educational Games
- `.كلمة` / `.رتب` — arrange a study-related word
- `.سرعة` / `.حساب_سريع` — quick arithmetic
- `.ذاكرة` — memory number challenge
- `.حل <الإجابة>` — answer educational games

## Important Fixes
- Menu supports English, Arabic, and Persian numerals.
- Bot admin detection supports newer WhatsApp JID/LID participant formats.
- Promote/demote group update parsing avoids `@undefined` and crash cases.
- Bot ignores its own sent messages before plugin processing to prevent reply loops.
- Owner/mod/bot matching is more tolerant of decoded JIDs and number formats.
- Profile command safely handles missing names and now sends profile picture plus full stored account/economy information.
- Database writes are triggered after message handling and before reconnect/exit to reduce data loss on restart.
- Song command supports explicit audio/video choice: `.اغنيه صوت ...`, `.اغنيه فيديو ...`, `.فيديو ...`.
- Legacy `.ترجم` plugins are disabled; global translator remains active.
- Duplicate bank commands are removed from active use; `plugins/البنك.js` is the main bank.
