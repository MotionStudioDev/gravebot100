const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { guardSettings, guardWarns } = require('./store');

const DEFAULT_BAD_WORDS = [
  'amk', 'aq', 'amq', 'amcik', 'sik', 'siktir', 'sikeyim', 'yarrak', 'yarak',
  'orospu', 'orosp', 'pic', 'pisc', 'got', 'gotu', 'yavsak', 'yavshak', 'ibne',
  'gerizekali', 'gerizekali', 'salak', 'aptal', 'mal', 'serefsiz', 'serfsz',
  'kahpe', 'kaltak', 'dangalak', 'beyinsiz', 'embesil', 'pust',
  'surtuk', 'kashar', 'zibidi', 'oç', 'oc', 'anani', 'bacini', 'sokayim',
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'porn', 'sex',
];

// Discord davet linkleri ve bilinen davet formatları
const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li|com\/invite|app\.com\/invite)|discordapp\.com\/invite|dsc\.gg|invite\.gg)\/([a-zA-Z0-9\-_]+)/gi;
// Gizlenmiş / boşluklu / noktalı davet spamları (örn: d i s c o r d . g g / code)
const OBFUSCATED_INVITE_REGEX = /d[\s\W_]*i[\s\W_]*s[\s\W_]*c[\s\W_]*o[\s\W_]*r[\s\W_]*d[\s\W_]*(?:\.|\(dot\)|\[dot\])[\s\W_]*(?:g[\s\W_]*g|c[\s\W_]*o[\s\W_]*m[\s\W_]*\/[\s\W_]*i[\s\W_]*n[\s\W_]*v[\s\W_]*i[\s\W_]*t[\s\W_]*e)[\s\W_]*\/[\s\W_]*([a-zA-Z0-9\-_]+)/gi;
// Genel web linkleri & alan adları
const LINK_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:com|net|org|gg|xyz|tk|ml|ga|cf|gq|io|me|info|biz|site|online|top|club|vip|live|pro|space|fun|store|app|dev)(?:\/[^\s]*)?)/i;

const MODLOG_EVENTS = {
  silme: 'Mesaj Silme',
  duzenleme: 'Mesaj Duzenleme',
  katilma: 'Uye Katilma',
  ayrilma: 'Uye Ayrilma',
  yasak: 'Yasaklama / Yasagi Kaldirma',
  susturma: 'Susturma (Timeout)',
  rol: 'Rol Degisiklikleri',
  kanal: 'Kanal Olusturma / Silme / Guncelleme',
  ses: 'Ses Kanali Hareketleri',
};

function defaultGuard() {
  return {
    kufur: { enabled: false, action: 'uyar', muteMin: 10, limit: 3, extraWords: [], removedWords: [], bypassRoles: [], bypassChannels: [] },
    reklam: { enabled: false, action: 'uyar', muteMin: 10, limit: 3, allowedLinks: [], bypassRoles: [], bypassChannels: [], blockInvites: true, blockLinks: true, bypassAdmin: false },
    antiraid: { enabled: false, limit: 5, seconds: 10, action: 'kilitle', lockMin: 5 },
    modlog: { enabled: false, channelId: null, events: Object.fromEntries(Object.keys(MODLOG_EVENTS).map(k => [k, true])) },
  };
}

async function getGuard(guildId) {
  const saved = await guardSettings.get(guildId).catch(() => null);
  const def = defaultGuard();
  if (!saved) return def;
  return {
    kufur: { ...def.kufur, ...(saved.kufur || {}) },
    reklam: { ...def.reklam, ...(saved.reklam || {}) },
    antiraid: { ...def.antiraid, ...(saved.antiraid || {}) },
    modlog: { ...def.modlog, ...(saved.modlog || {}), events: { ...def.modlog.events, ...((saved.modlog || {}).events || {}) } },
  };
}

async function saveGuard(guildId, guard) {
  await guardSettings.set(guildId, guard);
}

function normalize(text) {
  return text
    .toLocaleLowerCase('tr')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/[$\u20ac]/g, 's')
    .replace(/[!]/g, 'i')
    .replace(/[^a-z\u00e7\u011f\u0131\u00f6\u015f\u00fc\s]/g, ' ')
    .replace(/(\w)\1{1,}/g, '$1')
    .replace(/\s+/g, '');
}

function findBadWord(content, extraWords, removedWords) {
  extraWords = extraWords || [];
  removedWords = removedWords || [];
  const removed = new Set(removedWords.map(function(w) { return String(w).toLocaleLowerCase('tr'); }));
  const words = new Set(
    DEFAULT_BAD_WORDS.concat(extraWords.map(function(w) { return String(w).toLocaleLowerCase('tr'); }))
      .filter(function(w) { return w && !removed.has(w); })
  );
  const tokens = content
    .toLocaleLowerCase('tr')
    .replace(/[^a-z\u00e7\u011f\u0131\u00f6\u015f\u00fc\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(function(t) { return t.replace(/(\w)\1{1,}/g, '$1'); });
  for (const t of tokens) {
    if (words.has(t)) return t;
  }
  const spaceless = normalize(content);
  for (const w of words) {
    if (w.length >= 3 && spaceless.includes(w)) return w;
  }
  return null;
}

function findAd(content, reklam) {
  if (reklam.blockInvites) {
    INVITE_REGEX.lastIndex = 0;
    const inviteMatch = content.match(INVITE_REGEX);
    if (inviteMatch && inviteMatch.length > 0) {
      return { type: 'davet', match: inviteMatch[0].slice(0, 100), count: inviteMatch.length };
    }

    OBFUSCATED_INVITE_REGEX.lastIndex = 0;
    const obfMatch = content.match(OBFUSCATED_INVITE_REGEX);
    if (obfMatch && obfMatch.length > 0) {
      return { type: 'davet', match: obfMatch[0].slice(0, 100), count: obfMatch.length };
    }
  }

  if (reklam.blockLinks) {
    const m = content.match(LINK_REGEX);
    if (m) {
      const url = m[0].toLocaleLowerCase('tr');
      const allowed = (reklam.allowedLinks || []).some(function(d) { return url.includes(String(d).toLocaleLowerCase('tr')); });
      if (!allowed) return { type: 'link', match: m[0].slice(0, 100), count: 1 };
    }
  }
  return null;
}

function isBypass(member, channelId, cfg) {
  if (!member) return false;
  // Sunucu sahibi her zaman muaftır
  if (member.id === member.guild?.ownerId) return true;

  // cfg.bypassAdmin true ise veya varsayılan administrator bypass (cfg.bypassAdmin false değilse)
  // Ancak reklam patlatıcıları ve raid hesapları bazen yetki kaçırabildiğinden ya da test edilirken:
  // Eğer cfg.bypassAdmin false ise admin bile olsa engellenir.
  if (cfg.bypassAdmin !== false && member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  if ((cfg.bypassRoles || []).some(function(id) { return member.roles.cache.has(id); })) return true;
  if ((cfg.bypassChannels || []).includes(channelId)) return true;
  return false;
}

async function sendModlog(guild, eventKey, embed) {
  try {
    const guard = await getGuard(guild.id);
    if (!guard.modlog.enabled || !guard.modlog.channelId) return false;
    if (eventKey && guard.modlog.events && guard.modlog.events[eventKey] === false) return false;
    const channel = guild.channels.cache.get(guard.modlog.channelId);
    if (!channel || !channel.isTextBased()) return false;
    await channel.send({ embeds: [embed] });
    return true;
  } catch {
    return false;
  }
}

function modlogEmbed(opts) {
  const e = new EmbedBuilder()
    .setColor(opts.color)
    .setTitle(opts.title)
    .setDescription(opts.description || null)
    .setTimestamp()
    .setFooter({ text: 'Grave Koruma \u2022 Mod-Log' });
  if (opts.user) e.setAuthor({ name: opts.user.tag, iconURL: opts.user.displayAvatarURL({ dynamic: true }) });
  if (opts.thumbnail) e.setThumbnail(opts.thumbnail);
  if (opts.fields) { for (const f of opts.fields) e.addFields(f); }
  return e;
}

const joinTracker = new Map();
function trackJoin(guildId, memberId) {
  const now = Date.now();
  let rec = joinTracker.get(guildId);
  if (!rec) { rec = { times: [], ids: [], locked: false, cooldownUntil: 0 }; joinTracker.set(guildId, rec); }
  rec.times.push(now);
  rec.ids.push(memberId);
  return rec;
}
function pruneJoins(rec, seconds) {
  const cutoff = Date.now() - seconds * 1000;
  while (rec.times.length && rec.times[0] < cutoff) { rec.times.shift(); rec.ids.shift(); }
}

module.exports = {
  DEFAULT_BAD_WORDS, MODLOG_EVENTS, defaultGuard, getGuard, saveGuard,
  normalize, findBadWord, findAd, isBypass, sendModlog, modlogEmbed,
  trackJoin, pruneJoins, joinTracker, guardWarns,
};
