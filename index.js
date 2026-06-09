require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { log } = require('./src/utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// ─── Load events ──────────────────────────────────────────────────────────────
const eventFiles = [
  require('./src/events/ready'),
  require('./src/events/interactionCreate'),
  require('./src/events/memberJoin'),
  ...require('./src/events/intro'),
  ...require('./src/events/reactRoles'),
];

for (const event of eventFiles) {
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch(err => {
  log('error', `Login failed: ${err.message}`);
  process.exit(1);
});