// ─── config.js ────────────────────────────────────────────────────────────────
// Semua konfigurasi bot ada di sini.
// Untuk ubah nilai, cukup edit file ini atau .env — tidak perlu sentuh file lain.
// ───────────────────────────────────────────────────────────────────────────────

module.exports = {
  // ── Channel IDs ─────────────────────────────────────────────────────────────
  INTRO_CHANNEL_ID : process.env.INTRO_CHANNEL_ID,
  LOG_CHANNEL_ID   : process.env.LOG_CHANNEL_ID,
  STAFF_CHANNEL_ID : process.env.STAFF_CHANNEL_ID,
  RULES_CHANNEL_ID      : process.env.RULES_CHANNEL_ID,
  REACT_ROLES_CHANNEL_ID: process.env.REACT_ROLES_CHANNEL_ID,

  // ── Rules embed ─────────────────────────────────────────────────────────────
  RULES_BANNER_URL : process.env.RULES_BANNER_URL,

  // ── Intro ───────────────────────────────────────────────────────────────────
  ROLE_NAME    : 'IAS Member',
  INTRO_SLOWMODE : 30, // detik

  EMOJI_VALID   : '✅',
  EMOJI_INVALID : '❌',

  REQUIRED_FIELDS: [
    { key: 'nama',             label: 'Nama' },
    { key: 'domisili',         label: 'Domisili' },
    { key: 'hobby',            label: 'Hobby' },
    { key: 'flight simulator', label: 'Flight Simulator' },
    { key: 'harapan',          label: 'Harapan' },
  ],

  // ── Staff roles untuk notifikasi member baru ─────────────────────────────
  // Tambah/hapus nama role sesuai kebutuhan
  STAFF_ROLES: [
    'Admin',
    'Moderator',
    'Staff',
  ],

  // ── Server rules ─────────────────────────────────────────────────────────
  // Edit teks di sini untuk update rules — lalu /postrules di Discord
  RULES: [
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
  ],
};