const { PermissionFlagsBits } = require('discord.js');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getGuard, saveGuard, MODLOG_EVENTS } = require('../utils/guard');

const ACCENT = 0x2B2D31;
const CEZA_ACIKLAMA = { sil: 'Sadece mesajı siler', uyar: 'Siler + uyarır, limite ulaşınca susturur', mute: 'Siler + direkt susturur' };
const RAID_CEZA = { kilitle: 'Sunucuyu kilitler (yazma kapanır)', kick: 'Son katılanları sunucudan atar', ban: 'Son katılanları yasaklar' };

function panel(title, body) {
  const c = new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> 🛡️ **${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

const onoff = v => (v ? '✅ Açık' : '❌ Kapalı');
const sysName = s => ({ kufur: 'Küfür Filtresi', reklam: 'Reklam Filtresi', antiraid: 'Anti-Raid', modlog: 'Mod-Log' }[s] || s);

function normSys(s) {
  s = (s || '').toLocaleLowerCase('tr');
  if (['küfür', 'kufur', 'küfur', 'kufür', 'swear', 'badword'].includes(s)) return 'kufur';
  if (['reklam', 'ad', 'ads', 'link'].includes(s)) return 'reklam';
  if (['antiraid', 'anti-raid', 'raid'].includes(s)) return 'antiraid';
  if (['modlog', 'mod-log', 'log'].includes(s)) return 'modlog';
  if (['tümü', 'tumu', 'hepsi', 'all'].includes(s)) return 'tumu';
  if (['durum', 'status', 'panel'].includes(s)) return 'durum';
  if (['yardım', 'yardim', 'help', 'h'].includes(s)) return 'yardim';
  return null;
}

function mentionTarget(message, raw) {
  const role = message.mentions.roles.first() || message.guild.roles.cache.get(raw);
  if (role) return { kind: 'rol', id: role.id, tag: `${role}` };
  const channel = message.mentions.channels.first() || message.guild.channels.cache.get(raw);
  if (channel) return { kind: 'kanal', id: channel.id, tag: `${channel}` };
  return null;
}

module.exports = {
  name: 'koruma',
  description: 'Küfür, reklam, anti-raid ve mod-log sistemlerini tek yerden yönetir.',
  aliases: ['guard', 'güvenlik', 'guvenlik'],
  usage: '<durum|yardım|tümü|küfür|reklam|antiraid|modlog> ...',
  guildOnly: true,
  cooldown: 5,
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
        !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply(panel('Koruma Sistemi', '> ❌ **Yetki Hatası!**\n>\n> Bu komut için **Sunucuyu Yönet** yetkisi gerekir.'));
    }

    const guard = await getGuard(message.guild.id);
    const sub = normSys(args[0]);

    // ---- DURUM / BOŞ ----
    if (!sub || sub === 'durum') {
      const k = guard.kufur, r = guard.reklam, a = guard.antiraid, m = guard.modlog;
      const body =
        `> **${sysName('kufur')}:** ${onoff(k.enabled)}${k.enabled ? ` • Ceza: \`${k.action}\` • Limit: \`${k.limit}\` • Susturma: \`${k.muteMin}dk\`` : ''}\n` +
        `> **${sysName('reklam')}:** ${onoff(r.enabled)}${r.enabled ? ` • Ceza: \`${r.action}\` • Limit: \`${r.limit}\` • Davet: \`${r.blockInvites ? 'engelli' : 'serbest'}\` • Link: \`${r.blockLinks ? 'engelli' : 'serbest'}\`` : ''}\n` +
        `> **${sysName('antiraid')}:** ${onoff(a.enabled)}${a.enabled ? ` • \`${a.limit} kişi / ${a.seconds}sn\` • Ceza: \`${a.action}\` • Kilit süresi: \`${a.lockMin}dk\`` : ''}\n` +
        `> **${sysName('modlog')}:** ${onoff(m.enabled)}${m.enabled && m.channelId ? ` • Kanal: <#${m.channelId}>` : ''}` +
        `\n>\n> Detay: \`!koruma yardım\``;
      return message.reply(panel('Koruma Durumu', body));
    }

    // ---- YARDIM ----
    if (sub === 'yardim') {
      const p = '!';
      const body =
        `> **Genel**\n> \`${p}koruma durum\` — Tüm sistemlerin özeti\n> \`${p}koruma tümü aç|kapat\` — Küfür + reklam + anti-raid toplu\n` +
        `>\n> **Küfür / Reklam** _(ikisinde de aynı alt komutlar)_\n> \`${p}koruma küfür aç|kapat\`\n> \`${p}koruma küfür ceza sil|uyar|mute\`\n> \`${p}koruma küfür limit <1-10>\` — kaç uyarıda susturma\n> \`${p}koruma küfür süre <dk>\` — susturma süresi\n> \`${p}koruma küfür ekle <kelime>\` / \`çıkar\` / \`liste\` / \`sıfırla\`\n> \`${p}koruma küfür muaf ekle|çıkar @rol/#kanal\` / \`muaf liste\` / \`muaf temizle\`\n` +
        `>\n> **Reklam ekstraları**\n> \`${p}koruma reklam davet aç|kapat\` — discord davet linkleri\n> \`${p}koruma reklam link aç|kapat\` — tüm linkler\n> \`${p}koruma reklam izinli ekle <domain>\` / \`çıkar\` / \`liste\` / \`temizle\` _(örn: youtube.com)_\n` +
        `>\n> **Anti-Raid**\n> \`${p}koruma antiraid aç|kapat\`\n> \`${p}koruma antiraid hassasiyet <kişi 2-20> <saniye 5-120>\`\n> \`${p}koruma antiraid ceza kilitle|kick|ban\`\n> \`${p}koruma antiraid süre <dk 1-60>\` — kilit açılma süresi\n` +
        `>\n> **Mod-Log**\n> \`${p}koruma modlog aç #kanal\` / \`kapat\` / \`kanal #kanal\`\n> \`${p}koruma modlog olay <adı> aç|kapat\`\n> \`${p}koruma modlog olaylar\``;
      return message.reply(panel('Koruma Yardımı', body));
    }

    // ---- TÜMÜ ----
    if (sub === 'tumu') {
      const act = (args[1] || '').toLocaleLowerCase('tr');
      if (!['aç', 'ac', 'on', 'kapat', 'off'].includes(act)) {
        return message.reply(panel('Toplu İşlem', '> 📖 **Kullanım:**\n>\n> `!koruma tümü aç`\n> `!koruma tümü kapat`'));
      }
      const enable = ['aç', 'ac', 'on'].includes(act);
      guard.kufur.enabled = enable;
      guard.reklam.enabled = enable;
      guard.antiraid.enabled = enable;
      if (!enable) guard.modlog.enabled = false;
      await saveGuard(message.guild.id, guard);
      const note = enable && !guard.modlog.channelId ? '\n>\n> ⚠️ Mod-Log kanal seçilmediği için kapalı kaldı: `!koruma modlog aç #kanal`' : '';
      return message.reply(panel('Toplu İşlem', `> ${enable ? '✅' : '❌'} **Küfür + Reklam + Anti-Raid ${enable ? 'açıldı' : 'kapatıldı'}.**${note}`));
    }

    // ---- KÜFÜR / REKLAM ----
    if (sub === 'kufur' || sub === 'reklam') {
      const cfg = guard[sub];
      const act = (args[1] || '').toLocaleLowerCase('tr');

      if (!act) {
        const extra = sub === 'kufur'
          ? `Özel kelime: \`${cfg.extraWords.length}\` • Muaf rol: \`${cfg.bypassRoles.length}\` • Muaf kanal: \`${cfg.bypassChannels.length}\``
          : `Davet: \`${cfg.blockInvites ? 'engelli' : 'serbest'}\` • Link: \`${cfg.blockLinks ? 'engelli' : 'serbest'}\` • İzinli domain: \`${cfg.allowedLinks.length}\``;
        return message.reply(panel(sysName(sub),
          `> Durum: **${onoff(cfg.enabled)}**\n> Ceza: \`${cfg.action}\` ${CEZA_ACIKLAMA[cfg.action] ? `(${CEZA_ACIKLAMA[cfg.action]})` : ''}\n> Limit: \`${cfg.limit}\` uyarıda susturma • Susturma: \`${cfg.muteMin}dk\`\n> ${extra}\n>\n> Alt komutlar için: \`!koruma yardım\``));
      }

      if (['aç', 'ac', 'on', 'kapat', 'off'].includes(act)) {
        cfg.enabled = ['aç', 'ac', 'on'].includes(act);
        await saveGuard(message.guild.id, guard);
        return message.reply(panel(sysName(sub), `> ${cfg.enabled ? '✅' : '❌'} **${sysName(sub)} ${cfg.enabled ? 'açıldı' : 'kapatıldı'}.**`));
      }

      if (act === 'ceza') {
        const v = (args[2] || '').toLocaleLowerCase('tr');
        if (!['sil', 'uyar', 'uyari', 'mute'].includes(v)) {
          return message.reply(panel(sysName(sub), '> 📖 **Kullanım:** `!koruma ' + sub + ' ceza sil|uyar|mute`'));
        }
        cfg.action = v === 'uyari' ? 'uyar' : v;
        await saveGuard(message.guild.id, guard);
        return message.reply(panel(sysName(sub), `> ⚙️ Ceza **\`${cfg.action}\`** olarak ayarlandı.\n> ${CEZA_ACIKLAMA[cfg.action]}`));
      }

      if (act === 'limit') {
        const n = parseInt(args[2], 10);
        if (isNaN(n) || n < 1 || n > 10) return message.reply(panel(sysName(sub), '> 📖 **Kullanım:** `!koruma ' + sub + ' limit <1-10>`'));
        cfg.limit = n;
        await saveGuard(message.guild.id, guard);
        return message.reply(panel(sysName(sub), `> ⚙️ **${n}** uyarıya ulaşan kullanıcı susturulacak.`));
      }

      if (act === 'süre' || act === 'sure') {
        const n = parseInt(args[2], 10);
        if (isNaN(n) || n < 1 || n > 1440) return message.reply(panel(sysName(sub), '> 📖 **Kullanım:** `!koruma ' + sub + ' süre <dakika 1-1440>`'));
        cfg.muteMin = n;
        await saveGuard(message.guild.id, guard);
        return message.reply(panel(sysName(sub), `> ⚙️ Susturma süresi **${n} dakika** olarak ayarlandı.`));
      }

      // küfür kelime yönetimi
      if (sub === 'kufur' && ['ekle', 'cikar', 'çıkar', 'liste', 'sifirla', 'sıfırla'].includes(act)) {
        if (act === 'liste') {
          const list = cfg.extraWords.length ? cfg.extraWords.map(w => `\`${w}\``).join(' ') : '_ek kelime yok_';
          return message.reply(panel('Küfür • Özel Kelimeler', `> ${list}\n>\n> Toplam: **${cfg.extraWords.length}** (varsayılan liste + bunlar denetlenir)`));
        }
        if (act === 'sifirla' || act === 'sıfırla') {
          cfg.extraWords = []; cfg.removedWords = [];
          await saveGuard(message.guild.id, guard);
          return message.reply(panel('Küfür • Özel Kelimeler', '> 🗑️ Özel liste sıfırlandı, varsayılan listeye dönüldü.'));
        }
        if (act === 'ekle') {
          const words = args.slice(2).join(' ').split(/[, ]+/).map(w => w.toLocaleLowerCase('tr')).filter(w => w.length >= 2 && w.length <= 30);
          if (!words.length) return message.reply(panel('Küfür • Kelime Ekle', '> 📖 **Kullanım:** `!koruma küfür ekle <kelime>`'));
          let added = 0;
          for (const w of words) {
            if (!cfg.extraWords.includes(w)) { cfg.extraWords.push(w); added++; }
            cfg.removedWords = cfg.removedWords.filter(x => x !== w);
          }
          await saveGuard(message.guild.id, guard);
          return message.reply(panel('Küfür • Kelime Ekle', `> ✅ **${added}** kelime eklendi: ${words.map(w => `\`${w}\``).join(' ')}`));
        }
        const w = (args[2] || '').toLocaleLowerCase('tr');
        if (!w) return message.reply(panel('Küfür • Kelime Çıkar', '> 📖 **Kullanım:** `!koruma küfür çıkar <kelime>`'));
        cfg.extraWords = cfg.extraWords.filter(x => x !== w);
        if (!cfg.removedWords.includes(w)) cfg.removedWords.push(w);
        await saveGuard(message.guild.id, guard);
        return message.reply(panel('Küfür • Kelime Çıkar', `> 🗑️ \`${w}\` artık denetlenmeyecek.`));
      }

      // reklam özel: davet / link / admin / izinli
      if (sub === 'reklam' && (act === 'davet' || act === 'link' || act === 'admin')) {
        const v = (args[2] || '').toLocaleLowerCase('tr');
        if (!['aç', 'ac', 'on', 'kapat', 'off'].includes(v)) {
          return message.reply(panel('Reklam • ' + (act === 'davet' ? 'Davet' : (act === 'link' ? 'Link' : 'Yönetici Muafiyeti')), `> 📖 **Kullanım:** \`!koruma reklam ${act} aç|kapat\``));
        }
        const enable = ['aç', 'ac', 'on'].includes(v);
        if (act === 'davet') cfg.blockInvites = enable;
        else if (act === 'link') cfg.blockLinks = enable;
        else if (act === 'admin') cfg.bypassAdmin = enable;
        await saveGuard(message.guild.id, guard);
        let msg = '';
        if (act === 'davet') msg = `Davet linkleri ${enable ? 'engellenecek' : 'serbest'}.`;
        else if (act === 'link') msg = `Tüm linkler ${enable ? 'engellenecek' : 'serbest'}.`;
        else if (act === 'admin') msg = `Yönetici/Admin reklam muafiyeti ${enable ? 'aktif edildi (yöneticiler muaf)' : 'kapatıldı (yöneticiler de filtrelenir)'}.`;
        return message.reply(panel('Reklam Ayarı', `> ${enable ? '✅' : '🚫'} **${msg}**`));
      }

      if (sub === 'reklam' && ['izinli', 'whitelist', 'beyazliste'].includes(act)) {
        const op = (args[2] || '').toLocaleLowerCase('tr');
        if (op === 'liste' || !op) {
          const list = cfg.allowedLinks.length ? cfg.allowedLinks.map(d => `\`${d}\``).join('\n> ') : '_izinli domain yok_';
          return message.reply(panel('Reklam • İzinli Domainler', `> ${list}`));
        }
        if (op === 'temizle') {
          cfg.allowedLinks = [];
          await saveGuard(message.guild.id, guard);
          return message.reply(panel('Reklam • İzinli Domainler', '> 🗑️ İzinli liste temizlendi.'));
        }
        if (op === 'ekle' || op === 'cikar' || op === 'çıkar') {
          const d = (args[3] || '').toLocaleLowerCase('tr').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
          if (!d || !d.includes('.')) return message.reply(panel('Reklam • İzinli Domain', '> 📖 **Kullanım:** `!koruma reklam izinli ekle youtube.com`'));
          if (op === 'ekle') {
            if (!cfg.allowedLinks.includes(d)) cfg.allowedLinks.push(d);
            await saveGuard(message.guild.id, guard);
            return message.reply(panel('Reklam • İzinli Domain', `> ✅ \`${d}\` izinli listeye eklendi.`));
          }
          cfg.allowedLinks = cfg.allowedLinks.filter(x => x !== d);
          await saveGuard(message.guild.id, guard);
          return message.reply(panel('Reklam • İzinli Domain', `> 🗑️ \`${d}\` izinli listeden çıkarıldı.`));
        }
        return message.reply(panel('Reklam • İzinli Domain', '> 📖 `!koruma reklam izinli ekle|çıkar|liste|temizle`'));
      }

      // muaf yönetimi (ikisi için ortak)
      if (act === 'muaf') {
        const op = (args[2] || '').toLocaleLowerCase('tr');
        if (op === 'liste' || !op) {
          const roles = cfg.bypassRoles.length ? cfg.bypassRoles.map(id => `<@&${id}>`).join(' ') : '_yok_';
          const chans = cfg.bypassChannels.length ? cfg.bypassChannels.map(id => `<#${id}>`).join(' ') : '_yok_';
          return message.reply(panel(sysName(sub) + ' • Muafiyetler', `> **Roller:** ${roles}\n> **Kanallar:** ${chans}\n>\n> Yöneticiler ve Mesajları Yönet yetkisi otomatik muaftır.`));
        }
        if (op === 'temizle') {
          cfg.bypassRoles = []; cfg.bypassChannels = [];
          await saveGuard(message.guild.id, guard);
          return message.reply(panel(sysName(sub) + ' • Muafiyetler', '> 🗑️ Tüm muafiyetler temizlendi.'));
        }
        if (op === 'ekle' || op === 'cikar' || op === 'çıkar') {
          const raw = args[3] ? args[3].replace(/[<@#&!>]/g, '') : null;
          const t = raw ? mentionTarget(message, raw) : null;
          if (!t) return message.reply(panel(sysName(sub) + ' • Muafiyet', '> 📖 **Kullanım:** `!koruma ' + sub + ' muaf ekle @rol` veya `#kanal`'));
          const list = t.kind === 'rol' ? cfg.bypassRoles : cfg.bypassChannels;
          if (op === 'ekle') {
            if (!list.includes(t.id)) list.push(t.id);
            await saveGuard(message.guild.id, guard);
            return message.reply(panel(sysName(sub) + ' • Muafiyet', `> ✅ ${t.tag} filtreye **takılmayacak**.`));
          }
          const nl = list.filter(x => x !== t.id);
          if (t.kind === 'rol') cfg.bypassRoles = nl; else cfg.bypassChannels = nl;
          await saveGuard(message.guild.id, guard);
          return message.reply(panel(sysName(sub) + ' • Muafiyet', `> 🗑️ ${t.tag} muafiyetten çıkarıldı.`));
        }
        return message.reply(panel(sysName(sub) + ' • Muafiyet', '> 📖 `!koruma ' + sub + ' muaf ekle|çıkar|liste|temizle`'));
      }

      return message.reply(panel(sysName(sub), '> 📖 Alt komutlar için: `!koruma yardım`'));
    }

    // ---- ANTIRAID ----
    if (sub === 'antiraid') {
      const a = guard.antiraid;
      const act = (args[1] || '').toLocaleLowerCase('tr');

      if (!act) {
        return message.reply(panel('Anti-Raid',
          `> Durum: **${onoff(a.enabled)}**\n> Hassasiyet: \`${a.limit} kişi / ${a.seconds}sn\`\n> Ceza: \`${a.action}\` (${RAID_CEZA[a.action]})\n> Kilit süresi: \`${a.lockMin}dk\`\n>\n> \`!koruma antiraid hassasiyet 5 10\` • \`ceza kilitle|kick|ban\` • \`süre 5\``));
      }
      if (['aç', 'ac', 'on', 'kapat', 'off'].includes(act)) {
        a.enabled = ['aç', 'ac', 'on'].includes(act);
        await saveGuard(message.guild.id, guard);
        return message.reply(panel('Anti-Raid', `> ${a.enabled ? '✅' : '❌'} **Anti-Raid ${a.enabled ? 'açıldı' : 'kapatıldı'}.**`));
      }
      if (act === 'hassasiyet') {
        const n = parseInt(args[2], 10), s = parseInt(args[3], 10);
        if (isNaN(n) || isNaN(s) || n < 2 || n > 20 || s < 5 || s > 120) {
          return message.reply(panel('Anti-Raid', '> 📖 **Kullanım:** `!koruma antiraid hassasiyet <kişi 2-20> <saniye 5-120>`\n> Örn: `!koruma antiraid hassasiyet 5 10`'));
        }
        a.limit = n; a.seconds = s;
        await saveGuard(message.guild.id, guard);
        return message.reply(panel('Anti-Raid', `> ⚙️ **${n} kişi / ${s} saniye** içinde katılırsa raid sayılacak.`));
      }
      if (act === 'ceza') {
        const v = (args[2] || '').toLocaleLowerCase('tr');
        if (!['kilitle', 'kilit', 'lock', 'kick', 'at', 'ban', 'yasakla'].includes(v)) {
          return message.reply(panel('Anti-Raid', '> 📖 **Kullanım:** `!koruma antiraid ceza kilitle|kick|ban`'));
        }
        a.action = v.startsWith('kil') || v === 'lock' ? 'kilitle' : (v === 'ban' || v === 'yasakla' ? 'ban' : 'kick');
        await saveGuard(message.guild.id, guard);
        return message.reply(panel('Anti-Raid', `> ⚙️ Raid cezası: **\`${a.action}\`**\n> ${RAID_CEZA[a.action]}`));
      }
      if (act === 'süre' || act === 'sure') {
        const n = parseInt(args[2], 10);
        if (isNaN(n) || n < 1 || n > 60) return message.reply(panel('Anti-Raid', '> 📖 **Kullanım:** `!koruma antiraid süre <dk 1-60>`'));
        a.lockMin = n;
        await saveGuard(message.guild.id, guard);
        return message.reply(panel('Anti-Raid', `> ⚙️ Kilit **${n} dakika** sonra otomatik açılacak.`));
      }
      return message.reply(panel('Anti-Raid', '> 📖 `!koruma antiraid aç|kapat|hassasiyet|ceza|süre`'));
    }

    // ---- MODLOG ----
    if (sub === 'modlog') {
      const m = guard.modlog;
      const act = (args[1] || '').toLocaleLowerCase('tr');

      if (!act || act === 'olaylar') {
        const rows = Object.entries(MODLOG_EVENTS).map(([k, label]) => `> \`${k}\` — ${label}: **${m.events[k] ? '✅' : '❌'}**`).join('\n');
        return message.reply(panel('Mod-Log • Olaylar',
          `> Durum: **${onoff(m.enabled)}**${m.channelId ? ` • Kanal: <#${m.channelId}>` : ' • Kanal seçilmedi'}\n>\n${rows}\n>\n> Değiştir: \`!koruma modlog olay <adı> aç|kapat\``));
      }
      if (['aç', 'ac', 'on'].includes(act)) {
        const ch = message.mentions.channels.first() || message.guild.channels.cache.get((args[2] || '').replace(/[<#>]/g, ''));
        if (!ch || !ch.isTextBased()) {
          return message.reply(panel('Mod-Log', '> 📖 **Kullanım:** `!koruma modlog aç #kanal`'));
        }
        m.enabled = true; m.channelId = ch.id;
        await saveGuard(message.guild.id, guard);
        return message.reply(panel('Mod-Log', `> ✅ Mod-Log açıldı → ${ch}\n>\n> Olay seçimi: \`!koruma modlog olaylar\``));
      }
      if (['kapat', 'off'].includes(act)) {
        m.enabled = false;
        await saveGuard(message.guild.id, guard);
        return message.reply(panel('Mod-Log', '> ❌ Mod-Log kapatıldı.'));
      }
      if (act === 'kanal') {
        const ch = message.mentions.channels.first() || message.guild.channels.cache.get((args[2] || '').replace(/[<#>]/g, ''));
        if (!ch || !ch.isTextBased()) {
          return message.reply(panel('Mod-Log', '> 📖 **Kullanım:** `!koruma modlog kanal #kanal`'));
        }
        m.channelId = ch.id;
        await saveGuard(message.guild.id, guard);
        return message.reply(panel('Mod-Log', `> ⚙️ Log kanalı → ${ch}`));
      }
      if (act === 'olay') {
        const key = (args[2] || '').toLocaleLowerCase('tr');
        const v = (args[3] || '').toLocaleLowerCase('tr');
        if (!MODLOG_EVENTS[key]) {
          return message.reply(panel('Mod-Log • Olay', `> 📖 Geçerli olaylar: ${Object.keys(MODLOG_EVENTS).map(k => `\`${k}\``).join(' ')}`));
        }
        if (!['aç', 'ac', 'on', 'kapat', 'off'].includes(v)) {
          return message.reply(panel('Mod-Log • Olay', `> 📖 **Kullanım:** \`!koruma modlog olay ${key} aç|kapat\``));
        }
        m.events[key] = ['aç', 'ac', 'on'].includes(v);
        await saveGuard(message.guild.id, guard);
        return message.reply(panel('Mod-Log • Olay', `> **${MODLOG_EVENTS[key]}** ${m.events[key] ? '✅ açıldı' : '❌ kapatıldı'}.`));
      }
      return message.reply(panel('Mod-Log', '> 📖 `!koruma modlog aç #kanal|kapat|kanal|olay|olaylar`'));
    }

    return message.reply(panel('Koruma Sistemi', '> 📖 Kullanım için: `!koruma yardım`'));
  },
};
