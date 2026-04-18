import playdl from 'play-dl';
import yts from 'yt-search';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import os from 'os';

const streamPipeline = promisify(pipeline);

var handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) throw `*مثال: ${usedPrefix}${command} اية الكرسي*`;

  await m.reply(global.wait);

  let search = await yts(text);
  if (!search || !search.videos.length) throw '*لم يتم العثور على نتائج، جرب عنوانًا آخر*';

  let vid = search.videos[0];
  let { title, thumbnail, timestamp, views, ago, url } = vid;
  let wm = '〘<<>>〙';

  let captvid = `*❖───┊ ♪ يــوتـــيــوب ♪ ┊───❖*
  ❏ الـعـنوان: ${title}

  ❐ الـمده: ${timestamp}

  ❑ الــمـشهـدات: ${views}

  ❒ مـنذ: ${ago}

  ❒ الـرابــط: ${url}`;

  conn.sendMessage(m.chat, { image: { url: thumbnail }, caption: captvid }, { quoted: m });

  const stream = await playdl.stream(url, { quality: 2 });

  const tmpDir = os.tmpdir();
  const safeTitle = title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_').slice(0, 50);
  const filePath = `${tmpDir}/${safeTitle}_${Date.now()}.mp3`;

  await streamPipeline(stream.stream, fs.createWriteStream(filePath));

  let doc = {
    audio: { url: filePath },
    mimetype: 'audio/mp4',
    fileName: `${title}.mp3`,
    contextInfo: {
      externalAdReply: {
        showAdAttribution: true,
        mediaType: 2,
        mediaUrl: url,
        title: title,
        body: wm,
        sourceUrl: url,
        thumbnail: await (await conn.getFile(thumbnail)).data
      }
    }
  };

  await conn.sendMessage(m.chat, doc, { quoted: m });

  fs.unlink(filePath, (err) => {
    if (err) console.error(`Failed to delete audio file: ${err}`);
  });
};

handler.help = ['شغل <اسم الأغنية>'];
handler.tags = ['downloader'];
handler.command = /^شغل$/i;
handler.exp = 0;
handler.diamond = false;

export default handler;
