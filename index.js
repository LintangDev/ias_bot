require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { log } = require('./src/utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ─── Load events ──────────────────────────────────────────────────────────────
// Tambah file event baru di src/events/ — otomatis terdaftar di sini

const eventFiles = [
  require('./src/events/ready'),
  require('./src/events/interactionCreate'),
  require('./src/events/memberJoin'),
  // intro.js export array (MessageCreate + MessageUpdate)
  ...require('./src/events/intro'),
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
  log('error', `Gagal login: ${err.message}`);
  process.exit(1);
});