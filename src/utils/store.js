// ─── utils/store.js ───────────────────────────────────────────────────────────
// Simpan data persistent (message IDs, dll) ke file JSON
// agar tetap ada setelah bot restart

const fs   = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../../data/store.json');

function read() {
  try {
    if (!fs.existsSync(STORE_PATH)) return {};
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function write(data) {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

function get(key) {
  return read()[key] ?? null;
}

function set(key, value) {
  const data = read();
  data[key] = value;
  write(data);
}

module.exports = { get, set };