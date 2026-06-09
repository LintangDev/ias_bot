// ─── commands/reactRoles.js ───────────────────────────────────────────────────

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { log }   = require('../utils/logger');
const { set }   = require('../utils/store');
const { REACT_ROLES_CHANNEL_ID } = require('../config');

const REACT_ROLES = [
  {
    category: '✈️ Aircraft Brand',
    roles: [
      { emoji: '🔵', name: 'Boeing'  },
      { emoji: '🔴', name: 'Airbus'  },
    ],
  },
  {
    category: '🖥️ Flight Simulator',
    roles: [
      { emoji: '🟡', name: 'X-Plane' },
      { emoji: '🟢', name: 'MSFS'    },
    ],
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('postreactroles')
    .setDescription('Post embed react roles ke channel yang ditentukan (staff only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  REACT_ROLES,

  async execute(interaction) {
    const targetChannel = REACT_ROLES_CHANNEL_ID
      ? interaction.guild.channels.cache.get(REACT_ROLES_CHANNEL_ID)
      : interaction.channel;

    if (!targetChannel?.isTextBased()) {
      await interaction.reply({ content: '❌ React roles channel not found. Check `REACT_ROLES_CHANNEL_ID` in `.env`.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    // Hapus pesan lama bot di channel
    const fetched     = await targetChannel.messages.fetch({ limit: 20 });
    const botMessages = fetched.filter(m => m.author.id === interaction.client.user.id);
    for (const msg of botMessages.values()) await msg.delete().catch(() => {});

    // Build embed
    const fields = REACT_ROLES.map(cat => ({
      name: cat.category,
      value: cat.roles.map(r => `${r.emoji} — **${r.name}**`).join('\n'),
      inline: true,
    }));

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('🎭 React Roles')
      .setDescription('React dengan emoji di bawah untuk mendapatkan atau melepas role!\n\u200b')
      .addFields(fields)
      .setFooter({ text: 'React sekali untuk dapat role • React lagi untuk lepas role' });

    const message = await targetChannel.send({ embeds: [embed] });

    // Add semua reaction
    for (const cat of REACT_ROLES) {
      for (const role of cat.roles) {
        await message.react(role.emoji);
      }
    }

    // Simpan message ID ke store — persist setelah restart
    set('reactRolesMessageId', message.id);
    set('reactRolesChannelId', targetChannel.id);

    log('ok', `React roles posted by ${interaction.user.tag} to #${targetChannel.name} (msg: ${message.id})`);
    await interaction.editReply({ content: `✅ React roles berhasil di-post ke ${targetChannel}!` });
  },
};