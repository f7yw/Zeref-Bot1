import sharp from 'sharp';

const FILES = 'abcdefgh';
const START = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['.', '.', '.', '.', '.', '.', '.', '.'],
  ['.', '.', '.', '.', '.', '.', '.', '.'],
  ['.', '.', '.', '.', '.', '.', '.', '.'],
  ['.', '.', '.', '.', '.', '.', '.', '.'],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

const ICON = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟', '.': ''
};

const CELL = 80;
const MARGIN = 30;
const SIZE = CELL * 8 + MARGIN * 2;

const LIGHT = '#F0D9B5';
const DARK  = '#B58863';
const LABEL_COLOR = '#7A5A3A';
const WHITE_PIECE  = '#FFFFFF';
const BLACK_PIECE  = '#1A1A1A';
const WHITE_SHADOW = '#888';
const BLACK_SHADOW = '#fff6';

function cloneBoard() {
  return START.map(row => [...row]);
}

function pos(square) {
  if (!/^[a-h][1-8]$/i.test(square)) return null;
  const file = FILES.indexOf(square[0].toLowerCase());
  const rank = 8 - Number(square[1]);
  return { r: rank, c: file };
}

function isWhite(piece) {
  return piece && piece !== '.' && piece === piece.toUpperCase();
}

function pathClear(board, from, to) {
  const dr = Math.sign(to.r - from.r);
  const dc = Math.sign(to.c - from.c);
  let r = from.r + dr, c = from.c + dc;
  while (r !== to.r || c !== to.c) {
    if (board[r][c] !== '.') return false;
    r += dr; c += dc;
  }
  return true;
}

function legalMove(game, from, to) {
  const board = game.board;
  const piece = board[from.r][from.c];
  const target = board[to.r][to.c];
  if (piece === '.') return 'لا توجد قطعة في هذا المربع.';
  const whiteTurn = game.turn === 'w';
  if (isWhite(piece) !== whiteTurn) return 'هذه ليست قطعتك الآن.';
  if (target !== '.' && isWhite(target) === whiteTurn) return 'لا يمكنك أكل قطعة من نفس اللون.';
  const p = piece.toLowerCase();
  const dr = to.r - from.r, dc = to.c - from.c;
  const adr = Math.abs(dr), adc = Math.abs(dc);
  if (p === 'p') {
    const dir = isWhite(piece) ? -1 : 1;
    const startRow = isWhite(piece) ? 6 : 1;
    if (dc === 0 && target === '.' && dr === dir) return true;
    if (dc === 0 && target === '.' && from.r === startRow && dr === dir * 2 && board[from.r + dir][from.c] === '.') return true;
    if (adc === 1 && dr === dir && target !== '.') return true;
    return 'حركة البيدق غير صحيحة.';
  }
  if (p === 'n') return (adr === 2 && adc === 1) || (adr === 1 && adc === 2) || 'حركة الحصان غير صحيحة.';
  if (p === 'b') return (adr === adc && pathClear(board, from, to)) || 'حركة الفيل غير صحيحة أو الطريق مغلق.';
  if (p === 'r') return ((dr === 0 || dc === 0) && pathClear(board, from, to)) || 'حركة القلعة غير صحيحة أو الطريق مغلق.';
  if (p === 'q') return (((adr === adc) || dr === 0 || dc === 0) && pathClear(board, from, to)) || 'حركة الوزير غير صحيحة أو الطريق مغلق.';
  if (p === 'k') return (adr <= 1 && adc <= 1) || 'حركة الملك غير صحيحة.';
  return 'قطعة غير معروفة.';
}

function buildSvg(game) {
  let cells = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = MARGIN + c * CELL;
      const y = MARGIN + r * CELL;
      const fill = (r + c) % 2 === 0 ? LIGHT : DARK;
      cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${fill}"/>`;
      const piece = game.board[r][c];
      if (piece !== '.') {
        const icon = ICON[piece];
        const white = isWhite(piece);
        const cx = x + CELL / 2;
        const cy = y + CELL / 2 + 16;
        const shadowColor = white ? WHITE_SHADOW : BLACK_SHADOW;
        const fillColor = white ? WHITE_PIECE : BLACK_PIECE;
        cells += `<text x="${cx + 1}" y="${cy + 1}" text-anchor="middle" font-size="48" fill="${shadowColor}" font-family="Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,sans-serif">${icon}</text>`;
        cells += `<text x="${cx}" y="${cy}" text-anchor="middle" font-size="48" fill="${fillColor}" font-family="Segoe UI Emoji,Apple Color Emoji,Noto Color Emoji,sans-serif">${icon}</text>`;
      }
    }
  }

  let labels = '';
  const files = ['a','b','c','d','e','f','g','h'];
  for (let c = 0; c < 8; c++) {
    const x = MARGIN + c * CELL + CELL / 2;
    labels += `<text x="${x}" y="${MARGIN - 8}" text-anchor="middle" font-size="18" fill="${LABEL_COLOR}" font-family="Arial,sans-serif" font-weight="bold">${files[c]}</text>`;
    labels += `<text x="${x}" y="${MARGIN + 8 * CELL + 22}" text-anchor="middle" font-size="18" fill="${LABEL_COLOR}" font-family="Arial,sans-serif" font-weight="bold">${files[c]}</text>`;
  }
  for (let r = 0; r < 8; r++) {
    const y = MARGIN + r * CELL + CELL / 2 + 6;
    labels += `<text x="${MARGIN - 10}" y="${y}" text-anchor="middle" font-size="18" fill="${LABEL_COLOR}" font-family="Arial,sans-serif" font-weight="bold">${8 - r}</text>`;
    labels += `<text x="${MARGIN + 8 * CELL + 10}" y="${y}" text-anchor="middle" font-size="18" fill="${LABEL_COLOR}" font-family="Arial,sans-serif" font-weight="bold">${8 - r}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="#8B6914" rx="8"/>
  <rect x="${MARGIN - 4}" y="${MARGIN - 4}" width="${CELL * 8 + 8}" height="${CELL * 8 + 8}" fill="#5A3E1B" rx="2"/>
  ${cells}
  ${labels}
</svg>`;
}

async function renderBoard(game) {
  const svg = buildSvg(game);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function findGame(conn, chat, sender) {
  conn.chess = conn.chess || {};
  return Object.values(conn.chess).find(game =>
    game.chat === chat && [game.white, game.black].includes(sender)
  );
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  conn.chess = conn.chess || {};
  const sub = (args[0] || '').toLowerCase();
  let game = findGame(conn, m.chat, m.sender);

  if (/^(انهاء|حذف|stop|end)$/i.test(sub) && game) {
    delete conn.chess[game.id];
    return m.reply('♟️ تم إنهاء مباراة الشطرنج.');
  }

  if (/^(استسلام|surrender)$/i.test(sub) && game) {
    const winner = game.white === m.sender ? game.black : game.white;
    delete conn.chess[game.id];
    const img = await renderBoard(game);
    return conn.sendMessage(m.chat, {
      image: img,
      caption: `🏳️ استسلم @${m.sender.split('@')[0]}\n🏆 الفائز: @${winner.split('@')[0]}`,
      mentions: [m.sender, winner]
    }, { quoted: m });
  }

  if (!game) {
    const waiting = Object.values(conn.chess).find(item => item.chat === m.chat && !item.black);
    if (waiting && waiting.white !== m.sender) {
      waiting.black = m.sender;
      const img = await renderBoard(waiting);
      return conn.sendMessage(m.chat, {
        image: img,
        caption: `♟️ *شطرنج SHADOW*\n\n⬜ الأبيض: @${waiting.white.split('@')[0]}\n⬛ الأسود: @${waiting.black.split('@')[0]}\n\nبدأت المباراة — الأبيض يبدأ\nالحركة: *${usedPrefix}${command} e2 e4*\nالانسحاب: *${usedPrefix}${command} استسلام*`,
        mentions: [waiting.white, waiting.black]
      }, { quoted: m });
    }

    const id = `chess-${Date.now()}`;
    conn.chess[id] = { id, chat: m.chat, white: m.sender, black: null, turn: 'w', board: cloneBoard() };
    return m.reply(`♟️ تم إنشاء مباراة شطرنج.\nلينضم لاعب آخر يكتب:\n${usedPrefix}${command}`);
  }

  if (!game.black) return m.reply('⏳ المباراة بانتظار لاعب ثاني.');
  const expected = game.turn === 'w' ? game.white : game.black;
  if (m.sender !== expected) return m.reply('ليس دورك الآن.');

  const from = pos(args[0] || '');
  const to = pos(args[1] || '');
  if (!from || !to) return m.reply(`اكتب الحركة بهذا الشكل:\n${usedPrefix}${command} e2 e4`);

  const legal = legalMove(game, from, to);
  if (legal !== true) return m.reply(`❌ ${legal}`);

  const piece = game.board[from.r][from.c];
  const captured = game.board[to.r][to.c];
  game.board[to.r][to.c] = piece;
  game.board[from.r][from.c] = '.';
  if (piece === 'P' && to.r === 0) game.board[to.r][to.c] = 'Q';
  if (piece === 'p' && to.r === 7) game.board[to.r][to.c] = 'q';

  const img = await renderBoard(game);
  const turnPlayer = game.turn === 'w' ? game.black : game.white;
  const turnName = `@${turnPlayer.split('@')[0]}`;

  if (captured.toLowerCase() === 'k') {
    const winner = m.sender;
    delete conn.chess[game.id];
    return conn.sendMessage(m.chat, {
      image: img,
      caption: `🏆 كش ملك! الفائز @${winner.split('@')[0]}`,
      mentions: [game.white, game.black]
    }, { quoted: m });
  }

  game.turn = game.turn === 'w' ? 'b' : 'w';
  return conn.sendMessage(m.chat, {
    image: img,
    caption: `♟️ *شطرنج SHADOW*\n\n⬜ الأبيض: @${game.white.split('@')[0]}\n⬛ الأسود: @${game.black.split('@')[0]}\n\nالدور: ${turnName}\nالحركة: *${usedPrefix}${command} e2 e4*\nالانسحاب: *${usedPrefix}${command} استسلام*`,
    mentions: [game.white, game.black]
  }, { quoted: m });
};

handler.help = ['شطرنج', 'chess'];
handler.tags = ['game'];
handler.command = /^(شطرنج|chess)$/i;
export default handler;
