// ─── commands/postRules.js ────────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { log } = require('../utils/logger');
const { RULES_CHANNEL_ID, RULES_BANNER_URL, RULES } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('postrules')
    .setDescription('Post embed rules ke channel rules (staff only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const targetChannel = RULES_CHANNEL_ID
      ? interaction.guild.channels.cache.get(RULES_CHANNEL_ID)
      : interaction.channel;

    if (!targetChannel?.isTextBased()) {
      await interaction.reply({ content: '❌ Channel rules tidak ditemukan. Cek `RULES_CHANNEL_ID` di `.env`.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    // Hapus pesan lama bot di channel rules
    const fetched    = await targetChannel.messages.fetch({ limit: 20 });
    const botMessages = fetched.filter(m => m.author.id === interaction.client.user.id);
    for (const msg of botMessages.values()) await msg.delete().catch(() => {});

    // Build embed
    const COLOR     = 0x2b2d31;
    const rulesText = RULES
      .map(r => `${r.emoji} **${r.title}**\n${r.description}`)
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setDescription(rulesText + '\n\u200b')
      .setFooter({ text: 'Dengan berada di server ini, kamu menyetujui semua peraturan di atas.' });

    if (RULES_BANNER_URL) embed.setImage(RULES_BANNER_URL);

    await targetChannel.send({ embeds: [embed] });

    log('ok', `Rules posted by ${interaction.user.tag} to #${targetChannel.name}`);
    await interaction.editReply({ content: `✅ Rules berhasil di-post ke ${targetChannel}!` });
  },
};