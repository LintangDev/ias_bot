// ─── utils/sendLog.js ─────────────────────────────────────────────────────────

const { LOG_CHANNEL_ID } = require('../config');

async function sendLog(guild, embed) {
  if (!LOG_CHANNEL_ID) return;
  const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (ch?.isTextBased()) await ch.send({ embeds: [embed] });
}

module.exports = { sendLog };