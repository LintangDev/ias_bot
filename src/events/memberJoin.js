// ─── events/memberJoin.js ─────────────────────────────────────────────────────

const { Events, EmbedBuilder } = require('discord.js');
const { log }                   = require('../utils/logger');
const { STAFF_CHANNEL_ID, STAFF_ROLES } = require('../config');

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    log('info', `New member: ${member.user.username} (${member.id})`);
    if (!STAFF_CHANNEL_ID) return;

    const staffChannel = member.guild.channels.cache.get(STAFF_CHANNEL_ID);
    if (!staffChannel?.isTextBased()) {
      log('warn', `Staff channel not found: ${STAFF_CHANNEL_ID}`);
      return;
    }

    const mentions = STAFF_ROLES
      .map(name => member.guild.roles.cache.find(r => r.name === name))
      .filter(Boolean)
      .map(r => `<@&${r.id}>`)
      .join(' ');

    const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🛬 Member baru bergabung!')
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Member',       value: `${member} (${member.user.tag})`, inline: true },
        { name: 'ID',           value: member.id,                         inline: true },
        { name: 'Akun dibuat',  value: `${accountAge} hari yang lalu`,    inline: true },
        { name: 'Bergabung',    value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: 'Total member', value: `${member.guild.memberCount}`,     inline: true },
      )
      .setFooter({ text: 'Ingatkan member untuk mengisi perkenalan!' })
      .setTimestamp();

    await staffChannel.send({
      content: mentions ? `${mentions} ada member baru nih!` : '👋 Ada member baru!',
      embeds: [embed],
    }).catch(err => log('error', `Failed to send staff notification: ${err.message}`));
  },
};