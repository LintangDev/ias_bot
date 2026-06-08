require('dotenv').config();
const {
  Client, GatewayIntentBits, Events, EmbedBuilder,
  REST, Routes, SlashCommandBuilder, PermissionFlagsBits,
} = require('discord.js');

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
const STAFF_CHANNEL_ID  = process.env.STAFF_CHANNEL_ID;
const RULES_CHANNEL_ID  = process.env.RULES_CHANNEL_ID;
const RULES_BANNER_URL  = process.env.RULES_BANNER_URL;

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

// ─── RULES ────────────────────────────────────────────────────────────────────
// Edit teks di sini untuk update rules tanpa ubah logik bot
const RULES = [
  {
    emoji: '1️⃣',
    title: 'Respect Everyone',
    description:
      'Treat everyone with respect. Absolutely no harassment, witch hunting, sexism, racism, or hate speech will be tolerated.',
  },
  {
    emoji: '2️⃣',
    title: 'No Spam or Self-Promotion',
    description:
      'No spam or self-promotion (server invites, advertisements, etc) without permission from a staff member. This includes DMing fellow members.',
  },
  {
    emoji: '3️⃣',
    title: 'No Inappropriate Content',
    description:
      'No age-restricted or obscene content. This includes text, images, or links featuring nudity, sex, hard violence, or other graphically disturbing content.',
  },
  {
    emoji: '4️⃣',
    title: 'Report to Staff',
    description:
      'If you see something against the rules or something that makes you feel unsafe, let staff know. We want this server to be a welcoming space!',
  },
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

function buildRulesEmbeds() {
  const COLOR = 0x2b2d31;

  const rulesText = RULES
    .map(rule => `${rule.emoji} **${rule.title}**\n${rule.description}`)
    .join('\n\n');

  const main = new EmbedBuilder()
    .setColor(COLOR)
    .setDescription(rulesText + '\n\u200b')
    .setFooter({ text: 'Dengan berada di server ini, kamu menyetujui semua peraturan di atas.' });

  if (RULES_BANNER_URL) main.setImage(RULES_BANNER_URL);

  return [main];
}

// ─── Register slash command ───────────────────────────────────────────────────
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('postrules')
      .setDescription('Post embed rules ke channel rules (staff only)')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    log('ok', 'Slash command /postrules berhasil didaftarkan');
  } catch (err) {
    log('error', `Gagal daftarkan slash command: ${err.message}`);
  }
}

// ─── Bot siap ─────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async () => {
  log('ok',   `Bot aktif sebagai ${client.user.tag}`);
  log('info', `Channel intro : ${INTRO_CHANNEL_ID}`);
  log('info', `Channel log   : ${LOG_CHANNEL_ID || '(tidak diset)'}`);
  log('info', `Channel staff : ${STAFF_CHANNEL_ID || '(tidak diset)'}`);
  log('info', `Channel rules : ${RULES_CHANNEL_ID || '(tidak diset)'}`);

  // Set slowmode 30 detik di channel intro
  if (INTRO_CHANNEL_ID) {
    const introChannel = client.channels.cache.get(INTRO_CHANNEL_ID);
    if (introChannel?.isTextBased() && introChannel.rateLimitPerUser !== 30) {
      await introChannel.setRateLimitPerUser(30, 'Slowmode otomatis oleh IAS Bot')
        .then(() => log('ok', 'Slowmode 30 detik diset di channel intro'))
        .catch(err => log('warn', `Gagal set slowmode: ${err.message}`));
    }
  }

  await registerCommands();
});

// ─── Slash command handler ────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'postrules') {
    const targetChannel = RULES_CHANNEL_ID
      ? interaction.guild.channels.cache.get(RULES_CHANNEL_ID)
      : interaction.channel;

    if (!targetChannel?.isTextBased()) {
      await interaction.reply({ content: '❌ Channel rules tidak ditemukan. Cek `RULES_CHANNEL_ID` di `.env`.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Hapus pesan lama di channel rules (opsional — biar tidak dobel)
      const fetched = await targetChannel.messages.fetch({ limit: 20 });
      const botMessages = fetched.filter(m => m.author.id === client.user.id);
      for (const msg of botMessages.values()) await msg.delete().catch(() => {});

      // Post rules
      const embeds = buildRulesEmbeds();
      for (const embed of embeds) {
        await targetChannel.send({ embeds: [embed] });
      }

      log('ok', `Rules di-post oleh ${interaction.user.tag} ke #${targetChannel.name}`);
      await interaction.editReply({ content: `✅ Rules berhasil di-post ke ${targetChannel}!` });
    } catch (err) {
      log('error', `Gagal post rules: ${err.message}`);
      await interaction.editReply({ content: `❌ Gagal post rules: ${err.message}` });
    }
  }
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

      await message.react(EMOJI_VALID).catch(() => {});

      const replyMsg = await message.reply({
        content: `✈️ Selamat datang, ${member}! Perkenalan kamu diterima dan role **${ROLE_NAME}** sudah diberikan. Enjoy di IAS! 🛫`,
      });
      setTimeout(() => replyMsg.delete().catch(() => {}), 10_000);

      try {
        await message.author.send(
          `✈️ **Selamat datang di IAS, ${member.displayName}!**\n\n` +
          `Perkenalan kamu sudah diterima dan kamu kini mendapat role **${ROLE_NAME}**.\n` +
          `Selamat menikmati komunitas Indo Aviation Simmer! 🛫`
        );
      } catch {
        log('warn', `Tidak bisa DM ${tag} (DM dinonaktifkan)`);
      }

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

    await message.react(EMOJI_INVALID).catch(() => {});

    const missingList = missing.map(f => `• **${f.label}**`).join('\n');
    const replyMsg = await message.reply({
      content:
        `⚠️ Perkenalan kamu belum lengkap, ${member}!\n\n` +
        `Field yang kurang:\n${missingList}\n\n` +
        `Pastikan format pesanmu seperti ini:\n` +
        `\`\`\`\nNama: ...\nDomisili: ...\nHobby: ...\nFlight Simulator: ...\nHarapan: ...\`\`\`\n` +
        `Edit pesanmu atau kirim ulang ya! ✈️`,
    });
    setTimeout(() => replyMsg.delete().catch(() => {}), 20_000);

    try {
      await message.author.send(
        `⚠️ **Perkenalan kamu di IAS kurang lengkap!**\n\n` +
        `Field berikut belum ada:\n${missingList}\n\n` +
        `Format yang benar:\n\`\`\`\nNama: <nama>\nDomisili: <kota>\nHobby: <hobi>\nFlight Simulator: <simulator>\nHarapan: <harapan>\n\`\`\`\nEdit atau kirim ulang di channel perkenalan ya! ✈️`
      );
    } catch {
      log('warn', `Tidak bisa DM ${tag} (DM dinonaktifkan)`);
    }

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
  const member = newMessage.member;
  if (!member) return;
  const role = newMessage.guild?.roles.cache.find(r => r.name === ROLE_NAME);
  if (role && member.roles.cache.has(role.id)) return;
  processIntro(newMessage, true);
});

// ─── Event: Member baru masuk ─────────────────────────────────────────────────
client.on(Events.GuildMemberAdd, async (member) => {
  log('info', `Member baru: ${member.user.username} (${member.id})`);

  if (!STAFF_CHANNEL_ID) return;

  const staffChannel = member.guild.channels.cache.get(STAFF_CHANNEL_ID);
  if (!staffChannel?.isTextBased()) {
    log('warn', `Channel staff tidak ditemukan: ${STAFF_CHANNEL_ID}`);
    return;
  }

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
    .setFooter({ text: 'Ingatkan member untuk mengisi perkenalan!' })
    .setTimestamp();

  await staffChannel.send({
    content: mentions ? `${mentions} ada member baru nih!` : '👋 Ada member baru!',
    embeds: [embed],
  }).catch(err => log('error', `Gagal kirim notif staff: ${err.message}`));
});

client.login(process.env.DISCORD_TOKEN);