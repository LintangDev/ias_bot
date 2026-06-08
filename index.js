require('dotenv').config();
const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const INTRO_CHANNEL_ID  = process.env.INTRO_CHANNEL_ID;
const ROLE_NAME         = 'IAS Member';
const LOG_CHANNEL_ID    = process.env.LOG_CHANNEL_ID;

// Channel notifikasi member baru untuk staff
const STAFF_CHANNEL_ID  = process.env.STAFF_CHANNEL_ID;

// Role staff yang di-tag saat ada member baru — tambah/hapus sesuai kebutuhan
const STAFF_ROLES = [
  'Admin',
  'Moderator',
  'Staff',
];

const EMOJI_VALID   = '✅';
const EMOJI_INVALID = '❌';

const REQUIRED_FIELDS = [
  { key: 'nama',             label: 'Nama' },
  { key: 'domisili',         label: 'Domisili' },
  { key: 'hobby',            label: 'Hobby' },
  { key: 'flight simulator', label: 'Flight Simulator' },
  { key: 'harapan',          label: 'Harapan' },
];
// ───────────────────────────────────────────────────────────────────────────────

function log(level, msg) {
  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const prefix = { info: '📋', ok: '✅', warn: '⚠️ ', error: '❌' }[level] ?? '  ';
  console.log(`[${time}] ${prefix} ${msg}`);
}

function getMissingFields(content) {
  return REQUIRED_FIELDS.filter(({ key }) => {
    const regex = new RegExp(`${key}\\s*:`, 'i');
    return !regex.test(content);
  });
}

async function sendLog(guild, embed) {
  if (!LOG_CHANNEL_ID) return;
  const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (ch?.isTextBased()) await ch.send({ embeds: [embed] });
}

// ─── Bot siap ─────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, () => {
  log('ok',   `Bot aktif sebagai ${client.user.tag}`);
  log('info', `Channel intro : ${INTRO_CHANNEL_ID}`);
  log('info', `Channel log   : ${LOG_CHANNEL_ID || '(tidak diset)'}`);
  log('info', `New Member log   : ${STAFF_CHANNEL_ID}`);
});

// ─── Helper: proses intro ─────────────────────────────────────────────────────
async function processIntro(message, isEdit = false) {
  if (message.author.bot) return;
  if (message.channel.id !== INTRO_CHANNEL_ID) return;

  const member = message.member;
  if (!member) return;

  const tag = `${message.author.username} (${message.author.id})`;
  const missing = getMissingFields(message.content);

  // ── VALID ────────────────────────────────────────────────────────────────────
  if (missing.length === 0) {
    const role = message.guild.roles.cache.find(r => r.name === ROLE_NAME);
    if (!role) {
      log('warn', `Role "${ROLE_NAME}" tidak ditemukan di server!`);
      return;
    }

    if (member.roles.cache.has(role.id)) {
      log('info', `${tag} sudah punya role, skip.`);
      return;
    }

    try {
      await member.roles.add(role);
      log('ok', `Role diberikan ke ${tag}${isEdit ? ' (setelah edit)' : ''}`);

      // React ✅ di channel intro
      await message.react(EMOJI_VALID).catch(() => {});

      // Balas di channel intro
      const replyMsg = await message.reply({
        content:
          `✈️ Selamat datang, ${member}! Perkenalan kamu diterima dan role **${ROLE_NAME}** sudah diberikan. Enjoy di IAS! 🛫`,
      });

      // Auto-delete balasan setelah 10 detik biar channel tetap rapi
      setTimeout(() => replyMsg.delete().catch(() => {}), 10_000);

      // DM member
      try {
        await message.author.send(
          `✈️ **Selamat datang di IAS, ${member.displayName}!**\n\n` +
          `Perkenalan kamu sudah diterima dan kamu kini mendapat role **${ROLE_NAME}**.\n` +
          `Selamat menikmati komunitas Indo Aviation Simmer! 🛫`
        );
      } catch {
        log('warn', `Tidak bisa DM ${tag} (DM dinonaktifkan)`);
      }

      // Log channel
      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle(isEdit ? '✏️ Perkenalan diterima (setelah edit)' : '✅ Perkenalan diterima')
        .setThumbnail(message.author.displayAvatarURL())
        .addFields(
          { name: 'Member', value: `${message.author} (${message.author.tag})`, inline: true },
          { name: 'Role', value: ROLE_NAME, inline: true },
          { name: 'Pesan', value: `[Lihat](${message.url})` }
        )
        .setTimestamp();
      await sendLog(message.guild, embed);

    } catch (err) {
      log('error', `Gagal memberikan role ke ${tag}: ${err.message}`);
    }

  // ── TIDAK VALID ──────────────────────────────────────────────────────────────
  } else {
    const missingLabels = missing.map(f => f.label).join(', ');
    log('warn', `Intro tidak valid dari ${tag} — field kurang: ${missingLabels}`);

    // React ❌ di channel intro
    await message.react(EMOJI_INVALID).catch(() => {});

    // Balas di channel intro
    const missingList = missing.map(f => `• **${f.label}**`).join('\n');
    const replyMsg = await message.reply({
      content:
        `⚠️ Perkenalan kamu belum lengkap, ${member}!\n\n` +
        `Field yang kurang:\n${missingList}\n\n` +
        `Pastikan format pesanmu seperti ini:\n` +
        `\`\`\`\nNama: ...\nDomisili: ...\nHobby: ...\nFlight Simulator: ...\nHarapan: ...\`\`\`\n` +
        `Edit pesanmu atau kirim ulang ya! ✈️`,
    });

    // Auto-delete balasan setelah 20 detik
    setTimeout(() => replyMsg.delete().catch(() => {}), 20_000);

    // DM member
    try {
      await message.author.send(
        `⚠️ **Perkenalan kamu di IAS kurang lengkap!**\n\n` +
        `Field berikut belum ada:\n${missingList}\n\n` +
        `Format yang benar:\n\`\`\`\nNama: <nama>\nDomisili: <kota>\nHobby: <hobi>\nFlight Simulator: <simulator>\nHarapan: <harapan>\n\`\`\`\nEdit atau kirim ulang di channel perkenalan ya! ✈️`
      );
    } catch {
      log('warn', `Tidak bisa DM ${tag} (DM dinonaktifkan)`);
    }

    // Log channel
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Perkenalan tidak valid')
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: 'Member', value: `${message.author} (${message.author.tag})`, inline: true },
        { name: 'Field kurang', value: missingLabels, inline: true },
        { name: 'Pesan', value: `[Lihat](${message.url})` }
      )
      .setTimestamp();
    await sendLog(message.guild, embed);
  }
}

// ─── Events ───────────────────────────────────────────────────────────────────
client.on(Events.MessageCreate, (message) => processIntro(message, false));

client.on(Events.MessageUpdate, async (_, newMessage) => {
  if (newMessage.partial) {
    try { newMessage = await newMessage.fetch(); } catch { return; }
  }
  // Hanya re-check jika member belum punya role
  const member = newMessage.member;
  if (!member) return;
  const role = newMessage.guild?.roles.cache.find(r => r.name === ROLE_NAME);
  if (role && member.roles.cache.has(role.id)) return;
  processIntro(newMessage, true);
});

client.login(process.env.DISCORD_TOKEN);

// ─── Event: Member baru masuk ─────────────────────────────────────────────────
client.on(Events.GuildMemberAdd, async (member) => {
  log('info', `Member baru: ${member.user.username} (${member.id})`);

  if (!STAFF_CHANNEL_ID) return;

  const staffChannel = member.guild.channels.cache.get(STAFF_CHANNEL_ID);
  if (!staffChannel?.isTextBased()) {
    log('warn', `Channel staff tidak ditemukan: ${STAFF_CHANNEL_ID}`);
    return;
  }

  // Resolve role mentions — skip role yang tidak ada di server
  const mentions = STAFF_ROLES
    .map(name => member.guild.roles.cache.find(r => r.name === name))
    .filter(Boolean)
    .map(r => `<@&${r.id}>`)
    .join(' ');

  const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🛬 Member baru bergabung!')
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Member', value: `${member} (${member.user.tag})`, inline: true },
      { name: 'ID', value: member.id, inline: true },
      { name: 'Akun dibuat', value: `${accountAge} hari yang lalu`, inline: true },
      { name: 'Bergabung', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      { name: 'Total member', value: `${member.guild.memberCount}`, inline: true },
    )
    .setFooter({ text: 'Periksa detail member!' })
    .setTimestamp();

  await staffChannel.send({
    content: mentions ? `${mentions} New arrival coming!` : 'New arrival coming!',
    embeds: [embed],
  }).catch(err => log('error', `Gagal kirim notif staff: ${err.message}`));
});