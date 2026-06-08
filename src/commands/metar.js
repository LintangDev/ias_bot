// ─── commands/metar.js ────────────────────────────────────────────────────────

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { log } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('metar')
    .setDescription('Ambil data METAR dari VATSIM untuk suatu bandara')
    .addStringOption(opt =>
      opt.setName('icao')
        .setDescription('Kode ICAO bandara (contoh: WIII, WSSS, WADD)')
        .setMinLength(4)
        .setMaxLength(4)
        .setRequired(true)
    ),

  async execute(interaction) {
    const icao = interaction.options.getString('icao').toUpperCase();
    await interaction.deferReply();

    const res = await fetch(`https://metar.vatsim.net/metar.php?id=${icao}`);
    const raw = (await res.text()).trim();

    if (!raw || raw.startsWith('No METAR')) {
      await interaction.editReply({ content: `❌ Tidak ada data METAR untuk **${icao}**. Pastikan kode ICAO benar.` });
      return;
    }

    const parsed = parseMetar(raw);
    const embed  = buildMetarEmbed(icao, raw, parsed);

    log('info', `/metar ${icao} by ${interaction.user.tag}`);
    await interaction.editReply({ embeds: [embed] });
  },
};

// ── Parser ────────────────────────────────────────────────────────────────────

function parseMetar(raw) {
  const result = {};
  const tokens = raw.split(/\s+/);

  for (const token of tokens) {

    // Waktu observasi
    if (/^\d{6}Z$/.test(token)) {
      const day = token.slice(0, 2), hour = token.slice(2, 4), min = token.slice(4, 6);
      result.time = `Day ${day}, ${hour}:${min} UTC`;
    }

    // Wind
    if (/^(VRB|\d{3})\d{2,3}(G\d{2,3})?(KT|MPS)$/.test(token)) {
      const m = token.match(/^(VRB|(\d{3}))(\d{2,3})(G(\d{2,3}))?(KT|MPS)$/);
      if (m) {
        result.windDir   = m[1] === 'VRB' ? 'Variable' : `${m[2]}°`;
        result.windSpeed = `${m[3]} ${m[6]}`;
        result.windGust  = m[5] ? `${m[5]} ${m[6]}` : null;
      }
    }

    // Visibility
    if (token === 'CAVOK') result.visibility = 'CAVOK (>10 km, no cloud)';
    else if (/^\d{4}$/.test(token) && !result.time) result.visibility = `${parseInt(token)} m`;

    // Weather phenomena
    if (/^[-+]?(VC)?(MI|PR|BC|DR|BL|SH|TS|FZ)?(DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PO|SQ|FC|SS|DS)+$/.test(token)) {
      const wxMap = {
        RA:'Rain', SN:'Snow', TS:'Thunderstorm', FG:'Fog', BR:'Mist', HZ:'Haze',
        DZ:'Drizzle', SH:'Shower', GR:'Hail', IC:'Ice Crystals', FU:'Smoke',
        SA:'Sand', DU:'Dust', VA:'Volcanic Ash', SQ:'Squall', SS:'Sandstorm',
        DS:'Duststorm', PL:'Ice Pellets', GS:'Small Hail',
      };
      let wx = token;
      let intensity = 'Moderate';
      if (wx.startsWith('-')) { intensity = 'Light';  wx = wx.slice(1); }
      if (wx.startsWith('+')) { intensity = 'Heavy';  wx = wx.slice(1); }
      const code = Object.keys(wxMap).find(k => wx.includes(k));
      result.weather = `${intensity} ${code ? wxMap[code] : wx}`;
    }

    // Clouds
    if (/^(FEW|SCT|BKN|OVC)\d{3}(CB|TCU)?$/.test(token) || ['SKC','NSC','NCD'].includes(token)) {
      if (!result.clouds) result.clouds = [];
      const coverMap = { FEW:'Few', SCT:'Scattered', BKN:'Broken', OVC:'Overcast', SKC:'Sky Clear', NSC:'No Significant Cloud', NCD:'No Cloud Detected' };
      if (['SKC','NSC','NCD'].includes(token)) {
        result.clouds.push(coverMap[token]);
      } else {
        const m = token.match(/^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/);
        result.clouds.push(`${coverMap[m[1]]} @ ${(parseInt(m[2]) * 100).toLocaleString()} ft${m[3] ? ` (${m[3]})` : ''}`);
      }
    }

    // Temp & Dew
    if (/^(M?\d{2})\/(M?\d{2})$/.test(token)) {
      const parse = v => v.startsWith('M') ? -parseInt(v.slice(1)) : parseInt(v);
      const [t, d] = token.split('/');
      result.temp = `${parse(t)}°C`;
      result.dew  = `${parse(d)}°C`;
    }

    // QNH
    if (/^Q\d{4}$/.test(token)) result.qnh = `${token.slice(1)} hPa`;
    if (/^A\d{4}$/.test(token)) result.qnh = `${(parseInt(token.slice(1)) / 100).toFixed(2)} inHg`;

    // Trend
    if (['NOSIG','BECMG','TEMPO'].includes(token)) result.trend = token;
  }

  return result;
}

function flightCategory(parsed) {
  const hasCavok = parsed.visibility?.includes('CAVOK');
  if (hasCavok) return { cat: 'VFR', color: 0x2ecc71, emoji: '🟢' };

  const visNum = parsed.visibility ? parseInt(parsed.visibility) : 9999;
  const clouds  = parsed.clouds || [];
  const lowest  = clouds
    .map(c => { const m = c.match(/@ ([\d,]+) ft/); return m ? parseInt(m[1].replace(',','')) : null; })
    .filter(Boolean).sort((a,b) => a-b)[0];

  if (visNum < 1500 || (lowest && lowest < 500))  return { cat: 'LIFR', color: 0x9b59b6, emoji: '🟣' };
  if (visNum < 5000 || (lowest && lowest < 1000)) return { cat: 'IFR',  color: 0xe74c3c, emoji: '🔴' };
  if (visNum < 8000 || (lowest && lowest < 3000)) return { cat: 'MVFR', color: 0x3498db, emoji: '🔵' };
  return { cat: 'VFR', color: 0x2ecc71, emoji: '🟢' };
}

function buildMetarEmbed(icao, raw, p) {
  const fc = flightCategory(p);
  return new EmbedBuilder()
    .setColor(fc.color)
    .setTitle(`${fc.emoji} METAR — ${icao}`)
    .setDescription(`\`\`\`${raw}\`\`\``)
    .addFields(
      { name: '🕐 Waktu Observasi', value: p.time         || '—', inline: true },
      { name: '🏷️ Flight Category', value: fc.cat,                 inline: true },
      { name: '\u200b',             value: '\u200b',                inline: true },
      { name: '💨 Angin',           value: p.windDir && p.windSpeed
          ? `**Arah:** ${p.windDir}\n**Kecepatan:** ${p.windSpeed}${p.windGust ? `\n**Gust:** ${p.windGust}` : ''}`
          : '—', inline: true },
      { name: '👁️ Visibility',      value: p.visibility   || '—', inline: true },
      { name: '🌦️ Weather',         value: p.weather      || 'No significant weather', inline: true },
      { name: '☁️ Clouds',          value: p.clouds?.join('\n') || '—', inline: true },
      { name: '🌡️ Temp / Dew',      value: p.temp && p.dew ? `${p.temp} / ${p.dew}` : '—', inline: true },
      { name: '🔵 QNH',             value: p.qnh          || '—', inline: true },
      { name: '📈 Trend',           value: p.trend        || '—', inline: true },
    )
    .setFooter({ text: 'Source: VATSIM METAR • Data may differ from real-world' })
    .setTimestamp();
}