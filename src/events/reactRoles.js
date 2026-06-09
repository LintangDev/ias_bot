// ─── events/reactRoles.js ─────────────────────────────────────────────────────

const { Events } = require('discord.js');
const { log }    = require('../utils/logger');
const { get }    = require('../utils/store');
const { REACT_ROLES } = require('../commands/reactRoles');

// Flatten emoji → role name map
const EMOJI_ROLE_MAP = REACT_ROLES
  .flatMap(cat => cat.roles)
  .reduce((map, { emoji, name }) => { map[emoji] = name; return map; }, {});

async function handleReaction(reaction, user, isAdd) {
  if (user.bot) return;

  // Fetch partials jika perlu
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch { return; }
  }

  // Cek apakah ini pesan react roles yang tersimpan
  const savedMessageId = get('reactRolesMessageId');
  const savedChannelId = get('reactRolesChannelId');

  if (
    reaction.message.id      !== savedMessageId ||
    reaction.message.channel.id !== savedChannelId
  ) return;

  const emoji    = reaction.emoji.name;
  const roleName = EMOJI_ROLE_MAP[emoji];
  if (!roleName) return;

  const guild  = reaction.message.guild;
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  const role = guild.roles.cache.find(r => r.name === roleName);
  if (!role) {
    log('warn', `Role "${roleName}" not found on server`);
    return;
  }

  if (isAdd) {
    await member.roles.add(role)
      .then(() => log('ok',   `Role "${roleName}" added to ${user.tag}`))
      .catch(err => log('error', `Failed to add role ${roleName} to ${user.tag}: ${err.message}`));
  } else {
    await member.roles.remove(role)
      .then(() => log('info', `Role "${roleName}" removed from ${user.tag}`))
      .catch(err => log('error', `Failed to remove role ${roleName} from ${user.tag}: ${err.message}`));
  }
}

module.exports = [
  {
    name: Events.MessageReactionAdd,
    execute: (reaction, user) => handleReaction(reaction, user, true),
  },
  {
    name: Events.MessageReactionRemove,
    execute: (reaction, user) => handleReaction(reaction, user, false),
  },
];