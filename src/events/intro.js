// ─── events/intro.js ──────────────────────────────────────────────────────────

const { Events, EmbedBuilder } = require('discord.js');
const { log }     = require('../utils/logger');
const { sendLog } = require('../utils/sendLog');
const {
  INTRO_CHANNEL_ID, ROLE_NAME,
  EMOJI_VALID, EMOJI_INVALID, REQUIRED_FIELDS,
} = require('../config');

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMissingFields(content) {
  return REQUIRED_FIELDS.filter(({ key }) =>
    !new RegExp(`${key}\\s*:`, 'i').test(content)
  );
}

async function processIntro(message, isEdit = false) {
  if (message.author.bot) return;
  if (message.channel.id !== INTRO_CHANNEL_ID) return;

  const member = message.member;
  if (!member) return;

  const tag     = `${message.author.username} (${message.author.id})`;
  const missing = getMissingFields(message.content);

  // ── VALID ──────────────────────────────────────────────────────────────────
  if (missing.length === 0) {
    const role = message.guild.roles.cache.find(r => r.name === ROLE_NAME);
    if (!role) { log('warn', `Role "${ROLE_NAME}" not found!`); return; }

    if (member.roles.cache.has(role.id)) {
      log('info', `${tag} already has role, skipping.`);
      return;
    }

    try {
     // Hapus role lama jika ada
const arrivalRole = message.guild.roles.cache.find(r => r.name === 'Arrival');
if (arrivalRole && member.roles.cache.has(arrivalRole.id)) {
  await member.roles.remove(arrivalRole);
}

await member.roles.add(role);
      log('ok', `Role assigned to ${tag}${isEdit ? ' (after edit)' : ''}`);

      await message.react(EMOJI_VALID).catch(() => {});

      const reply = await message.reply({
        content: `✈️ Selamat datang, ${member}! Perkenalan diterima, role **${ROLE_NAME}** sudah diberikan. Enjoy di IAS! 🛫`,
      });
      setTimeout(() => reply.delete().catch(() => {}), 10_000);

      // DM
      await message.author.send(
        `✈️ **Selamat datang di IAS, ${member.displayName}!**\n\n` +
        `Perkenalan kamu diterima dan role **${ROLE_NAME}** sudah diberikan.\n` +
        `Selamat menikmati komunitas Indo Aviation Simmer! 🛫`
      ).catch(() => log('warn', `Could not DM ${tag}`));

      // Log channel
      await sendLog(message.guild, new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle(isEdit ? '✏️ Perkenalan diterima (after edit)' : '✅ Perkenalan diterima')
        .setThumbnail(message.author.displayAvatarURL())
        .addFields(
          { name: 'Member', value: `${message.author} (${message.author.tag})`, inline: true },
          { name: 'Role',   value: ROLE_NAME,                                   inline: true },
          { name: 'Pesan',  value: `[Lihat](${message.url})` },
        )
        .setTimestamp()
      );

    } catch (err) {
      log('error', `Failed to assign role to ${tag}: ${err.message}`);
    }

  // ── TIDAK VALID ────────────────────────────────────────────────────────────
  } else {
    const missingLabels = missing.map(f => f.label).join(', ');
    log('warn', `Invalid intro from ${tag} — missing: ${missingLabels}`);

    await message.react(EMOJI_INVALID).catch(() => {});

    const missingList = missing.map(f => `• **${f.label}**`).join('\n');
    const reply = await message.reply({
      content:
        `⚠️ Perkenalan kamu belum lengkap, ${member}!\n\n` +
        `Field yang kurang:\n${missingList}\n\n` +
        `Format yang benar:\n\`\`\`\nNama: ...\nDomisili: ...\nHobby: ...\nFlight Simulator: ...\nHarapan: ...\`\`\`\n` +
        `Edit atau kirim ulang ya! ✈️`,
    });
    setTimeout(() => reply.delete().catch(() => {}), 20_000);

    // DM
    await message.author.send(
      `⚠️ **Perkenalan kamu di IAS kurang lengkap!**\n\n` +
      `Field yang belum ada:\n${missingList}\n\n` +
      `Format yang benar:\n\`\`\`\nNama: <nama>\nDomisili: <kota>\nHobby: <hobi>\nFlight Simulator: <simulator>\nHarapan: <harapan>\n\`\`\`\nEdit atau kirim ulang ya! ✈️`
    ).catch(() => log('warn', `Could not DM ${tag}`));

    // Log channel
    await sendLog(message.guild, new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Perkenalan tidak valid')
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: 'Member',      value: `${message.author} (${message.author.tag})`, inline: true },
        { name: 'Field kurang', value: missingLabels,                               inline: true },
        { name: 'Pesan',       value: `[Lihat](${message.url})` },
      )
      .setTimestamp()
    );
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = [
  {
    name: Events.MessageCreate,
    execute: (message) => processIntro(message, false),
  },
  {
    name: Events.MessageUpdate,
    async execute(_, newMessage) {
      if (newMessage.partial) {
        try { newMessage = await newMessage.fetch(); } catch { return; }
      }
      const member = newMessage.member;
      if (!member) return;
      const role = newMessage.guild?.roles.cache.find(r => r.name === ROLE_NAME);
      if (role && member.roles.cache.has(role.id)) return;
      processIntro(newMessage, true);
    },
  },
];