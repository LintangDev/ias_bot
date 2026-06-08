// ─── utils/logger.js ──────────────────────────────────────────────────────────

function log(level, msg) {
  const time   = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const prefix = { info: '📋', ok: '✅', warn: '⚠️ ', error: '❌' }[level] ?? '  ';
  console.log(`[${time}] ${prefix} ${msg}`);
}

module.exports = { log };