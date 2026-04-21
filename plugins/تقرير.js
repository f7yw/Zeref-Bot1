import { isVip } from '../lib/economy.js'
let handler = async (m, { conn }) => {
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  // تجاهل رسائل المجموعات
  if (m.isGroup) return;

  // رقم صاحب البوت (الذي تصله التقارير)
  const ownerJid = '967778088098@s.whatsapp.net'; // ← غيّره لرقمك

  // بناء التقرير
  const info = `
📥 *رسالة واردة في الخاص*
━━━━━━━━━━━━━
👤 *من:* wa.me/${m.sender.split('@')[0]}
💬 *الرسالة:* ${m.text || 'رسالة غير نصية (صوت/صورة/فيديو...)'}
📄 *النوع:* ${m.mtype}
🕒 *الوقت:* ${new Date().toLocaleString('ar-EG')}
━━━━━━━━━━━━━
`.trim();

  // إرسال التقرير إلى رقمك
  await conn.sendMessage(ownerJid, { text: info });
};

handler.all = true;   // لالتقاط كل الرسائل
handler.private = true;  // فقط الخاص

export default handler;