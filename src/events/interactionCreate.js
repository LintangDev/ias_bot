// ─── events/interactionCreate.js ─────────────────────────────────────────────

const { Events } = require('discord.js');
const { log }    = require('../utils/logger');

const postRulesCommand = require('../commands/postRules');
const metarCommand     = require('../commands/metar');

// Map nama command → handler
const commands = new Map([
  [postRulesCommand.data.name, postRulesCommand],
  [metarCommand.data.name,     metarCommand],
]);

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      log('error', `Error in /${interaction.commandName}: ${err.message}`);
      const msg = { content: '❌ Terjadi error saat menjalankan command.', ephemeral: true };
      if (interaction.deferred) await interaction.editReply(msg);
      else await interaction.reply(msg);
    }
  },
};