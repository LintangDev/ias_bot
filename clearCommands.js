require('dotenv').config();
const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  // Clear global commands
  await rest.put(Routes.applicationCommands(process.env.APP_ID), { body: [] });
  console.log('✅ Global commands cleared');
})();