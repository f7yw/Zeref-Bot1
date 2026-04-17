# Zeref - SHADOW WhatsApp Bot

## Overview
A comprehensive, multi-functional WhatsApp bot built with Node.js. Features AI responses (ChatGPT), entertainment (anime, games, media), utility tools (translation, reminders, QR codes), an economy/RPG system, and owner/admin controls. Commands are fully in Arabic.

## Owner / Config
- **Owner number:** 967778088098 (single owner, set in `config.js`)
- **GitHub:** https://github.com/farisatif
- **Bot name:** 彡ℤ𝕖𝕣𝕖𝕗 / SHADOW Bot
- **Prefix:** `.` (and others defined in `global.prefix` regex)

## Tech Stack
- **Runtime:** Node.js (ES Modules)
- **WhatsApp:** `@whiskeysockets/baileys` for WhatsApp Web API
- **Database:** Lowdb (JSON-based local storage via `database.json`)
- **Server:** Express on port 3000 (keeps bot alive on hosting platforms)
- **Key Libraries:** axios, fluent-ffmpeg, jimp, openai, cfonts, chalk, pino

## Architecture
- **`index.js`** - Entry point; manages cluster, checks internet, starts Express server on port 3000
- **`main.js`** - Core engine; initializes WhatsApp connection (Baileys), loads database, imports all plugins in parallel
- **`handler.js`** - Central message processor; routes commands to plugins, manages XP/money
- **`config.js`** - Global configuration: owner numbers, bot name, images, GitHub link, settings
- **`plugins/`** - 91 modular plugin files for each feature (flat folder, no index subfolder)
- **`lib/`** - Shared utility functions (simple.js, print.js, store.js, levelling.js)
- **`Zeref/`** - WhatsApp session credentials (creds.json)

## Configuration
- Owner and GitHub set in `config.js` using `global.owner`, `global.nomorown`, `global.md`
- Phone number for pairing comes from `PHONE_NUMBER` environment variable
- Bot uses pairing code authentication (no QR scan needed)

## Interactive Menus
WhatsApp's native buttons and list messages are blocked by Meta for unofficial clients.
The bot uses **poll messages** (`pollCreationMessage`) as interactive navigation — users tap a poll option to receive that section's commands. This is handled by:
- `plugins/منيو.js` — sends header image + stats + poll with 8 section options
- `main.js` poll vote handler (`messages.update` event) — detects vote, replies with that section's commands

## Running
- Workflow: `node index.js` on port 3000
- Bot auto-reconnects on disconnect using `process.exit()` triggers

## Key Bugs Fixed
- Removed `if (m.isGroup) return` from handler.js:34 — was blocking ALL group message responses
- Fixed `lib/print.js` JID parsing for `@lid` format (newer WhatsApp device IDs) — fixed "undefined" / "random numbers" in console display
- Fixed `plugins/الضعوم.js` — was crashing with undefined `buttonMessage` reference
- Fixed `plugins/بلاغ.js` — removed duplicate wrong-JID conn.reply
- Parallelized plugin loading in `main.js` with `Promise.all` for faster startup
- Fixed user stats display (was showing `|undefined|undefined` for new users)

## Menu Sections
1. 📖 القرآن الكريم — أذكار، آيات، قرآن
2. 🤖 الذكاء الاصطناعي — AI/ChatGPT
3. 🎮 الألعاب — اكس او، فزورة، رياضيات، خمن العلم
4. 😄 ترفيه — ذكاء، جمال، حظ، اقتباسات، حكم
5. 🛠️ الأدوات — ترجم، تذكير، منبه، QR، اختفاء
6. 💰 الاقتصاد — بنك، عمل، مستوى، شراء
7. 📊 المعلومات — حالة البوت، توقيت، بلاغ، المالك
8. 👑 أوامر المالك — صلاحيات كاملة
