// ─── events/ready.js ──────────────────────────────────────────────────────────

const { Events, REST, Routes } = require('discord.js');
const { log } = require('../utils/logger');
const { get } = require('../utils/store');
const { INTRO_CHANNEL_ID, LOG_CHANNEL_ID, STAFF_CHANNEL_ID, RULES_CHANNEL_ID, INTRO_SLOWMODE } = require('../config');

const postRulesCommand  = require('../commands/postRules');
const metarCommand      = require('../commands/metar');
const reactRolesCommand = require('../commands/reactRoles');

async function registerCommands(client) {
  const commands = [
    postRulesCommand.data.toJSON(),
    metarCommand.data.toJSON(),
    reactRolesCommand.data.toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    log('ok', `${commands.length} slash commands registered successfully`);
  } catch (err) {
    log('error', `Failed to register slash commands: ${err.message}`);
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    log('ok',   `Bot online as ${client.user.tag}`);
    log('info', `Channel intro : ${INTRO_CHANNEL_ID}`);
    log('info', `Channel log   : ${LOG_CHANNEL_ID   || '(not set)'}`);
    log('info', `Channel staff : ${STAFF_CHANNEL_ID || '(not set)'}`);
    log('info', `Channel rules : ${RULES_CHANNEL_ID || '(not set)'}`);

    // Set slowmode di channel intro
    if (INTRO_CHANNEL_ID) {
      const introChannel = client.channels.cache.get(INTRO_CHANNEL_ID);
      if (introChannel?.isTextBased() && introChannel.rateLimitPerUser !== INTRO_SLOWMODE) {
        await introChannel.setRateLimitPerUser(INTRO_SLOWMODE, 'Slowmode otomatis oleh IAS Bot')
          .then(() => log('ok', `Slowmode ${INTRO_SLOWMODE}s set on intro channel`))
          .catch(err => log('warn', `Failed to set slowmode: ${err.message}`));
      }
    }

    await registerCommands(client);

    // Fetch pesan react roles ke cache agar reaction event ter-trigger setelah restart
    const savedChannelId = get('reactRolesChannelId');
    const savedMessageId = get('reactRolesMessageId');
    if (savedChannelId && savedMessageId) {
      try {
        const ch = await client.channels.fetch(savedChannelId);
        await ch.messages.fetch(savedMessageId);
        log('ok', `React roles message cached (${savedMessageId})`);
      } catch (err) {
        log('warn', `Could not cache react roles message: ${err.message}`);
      }
    }
  },
};