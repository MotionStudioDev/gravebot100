const { AuditLogEvent } = require('discord.js');
const { getGuard, sendModlog, modlogEmbed } = require('../utils/guard');

async function executorOf(guild, type, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 5 });
    const entry = logs.entries.find(e => String(e.target?.id) === String(targetId));
    return (entry || logs.entries.first())?.executor || null;
  } catch {
    return null;
  }
}

const cut = (s, n = 1000) => (s && s.length > n ? s.slice(0, n) + '…' : (s || '_boş_'));

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log('[MODLOG] Mod-log dinleyicileri aktif');

    // ---- Mesaj silme ----
    client.on('messageDelete', async (message) => {
      try {
        if (!message.guild || message.author?.bot) return;
        const guard = await getGuard(message.guild.id);
        if (!guard.modlog.enabled || guard.modlog.events.silme === false) return;
        await sendModlog(message.guild, 'silme', modlogEmbed({
          color: 0xED4245,
          title: '🗑️ Mesaj Silindi',
          user: message.author,
          description: `**Kanal:** ${message.channel}\n**Yazar:** ${message.author} (\`${message.author?.id}\`)`,
          fields: [{ name: 'Silinen İçerik', value: cut(message.content) }],
          thumbnail: message.author?.displayAvatarURL({ dynamic: true }),
        }));
      } catch (e) { console.error('[MODLOG silme]', e.message); }
    });

    // ---- Mesaj düzenleme ----
    client.on('messageUpdate', async (oldMsg, newMsg) => {
      try {
        if (!newMsg.guild || newMsg.author?.bot) return;
        if ((oldMsg.content || '') === (newMsg.content || '')) return;
        const guard = await getGuard(newMsg.guild.id);
        if (!guard.modlog.enabled || guard.modlog.events.duzenleme === false) return;
        await sendModlog(newMsg.guild, 'duzenleme', modlogEmbed({
          color: 0xFEE75C,
          title: '✏️ Mesaj Düzenlendi',
          user: newMsg.author,
          description: `**Kanal:** ${newMsg.channel} • [Mesaja Git](${newMsg.url})\n**Yazar:** ${newMsg.author}`,
          fields: [
            { name: 'Eski Hali', value: cut(oldMsg.content), inline: false },
            { name: 'Yeni Hali', value: cut(newMsg.content), inline: false },
          ],
        }));
      } catch (e) { console.error('[MODLOG duzenleme]', e.message); }
    });

    // ---- Üye katılma ----
    client.on('guildMemberAdd', async (member) => {
      try {
        if (member.user.bot) return;
        const guard = await getGuard(member.guild.id);
        if (!guard.modlog.enabled || guard.modlog.events.katilma === false) return;
        const age = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
        await sendModlog(member.guild, 'katilma', modlogEmbed({
          color: 0x57F287,
          title: '📥 Üye Katıldı',
          user: member.user,
          description: `${member} sunucuya katıldı.`,
          fields: [
            { name: 'Hesap Yaşı', value: `${age} gün ${age < 7 ? '⚠️ (yeni hesap!)' : ''}`, inline: true },
            { name: 'Üye Sayısı', value: `${member.guild.memberCount}`, inline: true },
          ],
          thumbnail: member.user.displayAvatarURL({ dynamic: true }),
        }));
      } catch (e) { console.error('[MODLOG katilma]', e.message); }
    });

    // ---- Üye ayrılma ----
    client.on('guildMemberRemove', async (member) => {
      try {
        const guard = await getGuard(member.guild.id);
        if (!guard.modlog.enabled || guard.modlog.events.ayrilma === false) return;
        const roles = member.roles?.cache ? member.roles.cache.filter(r => r.id !== member.guild.id).map(r => `${r}`).join(' ') || '_rol yok_' : '_bilinmiyor_';
        await sendModlog(member.guild, 'ayrilma', modlogEmbed({
          color: 0xE67E22,
          title: '📤 Üye Ayrıldı',
          user: member.user,
          description: `**${member.user?.tag}** sunucudan ayrıldı / atıldı.`,
          fields: [{ name: 'Rolleri', value: cut(roles, 500) }],
          thumbnail: member.user?.displayAvatarURL({ dynamic: true }),
        }));
      } catch (e) { console.error('[MODLOG ayrilma]', e.message); }
    });

    // ---- Yasaklama ----
    client.on('guildBanAdd', async (ban) => {
      try {
        const guard = await getGuard(ban.guild.id);
        if (!guard.modlog.enabled || guard.modlog.events.yasak === false) return;
        const ex = await executorOf(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
        await sendModlog(ban.guild, 'yasak', modlogEmbed({
          color: 0x992D22,
          title: '🔨 Üye Yasaklandı',
          user: ban.user,
          description: `**Yasaklanan:** ${ban.user} (\`${ban.user.id}\`)\n**Sebep:** ${cut(ban.reason, 500)}`,
          fields: ex ? [{ name: 'Yasaklayan', value: `${ex} (\`${ex.id}\`)`, inline: true }] : [],
          thumbnail: ban.user.displayAvatarURL({ dynamic: true }),
        }));
      } catch (e) { console.error('[MODLOG yasak]', e.message); }
    });

    // ---- Yasağı kaldırma ----
    client.on('guildBanRemove', async (ban) => {
      try {
        const guard = await getGuard(ban.guild.id);
        if (!guard.modlog.enabled || guard.modlog.events.yasak === false) return;
        const ex = await executorOf(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
        await sendModlog(ban.guild, 'yasak', modlogEmbed({
          color: 0x57F287,
          title: '♻️ Yasak Kaldırıldı',
          user: ban.user,
          description: `**Kullanıcı:** ${ban.user} (\`${ban.user.id}\`)`,
          fields: ex ? [{ name: 'Kaldıran', value: `${ex} (\`${ex.id}\`)`, inline: true }] : [],
        }));
      } catch (e) { console.error('[MODLOG yasakkaldırma]', e.message); }
    });

    // ---- Susturma + rol değişiklikleri ----
    client.on('guildMemberUpdate', async (oldM, newM) => {
      try {
        const guard = await getGuard(newM.guild.id);
        if (!guard.modlog.enabled) return;

        // Susturma
        const wasMuted = oldM.communicationDisabledUntilTimestamp > Date.now();
        const isMuted = newM.communicationDisabledUntilTimestamp > Date.now();
        if (!wasMuted && isMuted && guard.modlog.events.susturma !== false) {
          const until = Math.floor(newM.communicationDisabledUntilTimestamp / 1000);
          const ex = await executorOf(newM.guild, AuditLogEvent.MemberUpdate, newM.id);
          await sendModlog(newM.guild, 'susturma', modlogEmbed({
            color: 0x9B59B6,
            title: '🔇 Üye Susturuldu',
            user: newM.user,
            description: `${newM} susturuldu.\n**Bitiş:** <t:${until}:F> (<t:${until}:R>)`,
            fields: ex ? [{ name: 'Susturan', value: `${ex}`, inline: true }] : [],
          }));
        } else if (wasMuted && !isMuted && guard.modlog.events.susturma !== false) {
          await sendModlog(newM.guild, 'susturma', modlogEmbed({
            color: 0x57F287,
            title: '🔈 Susturma Bitti / Kaldırıldı',
            user: newM.user,
            description: `${newM} artık konuşabilir.`,
          }));
        }

        // Roller
        if (guard.modlog.events.rol !== false) {
          const added = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id) && r.id !== newM.guild.id);
          const removed = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id) && r.id !== newM.guild.id);
          if (added.size || removed.size) {
            const ex = await executorOf(newM.guild, AuditLogEvent.MemberRoleUpdate, newM.id);
            const lines = [];
            if (added.size) lines.push(`**Verilen:** ${added.map(r => `${r}`).join(' ')}`);
            if (removed.size) lines.push(`**Alınan:** ${removed.map(r => `${r}`).join(' ')}`);
            await sendModlog(newM.guild, 'rol', modlogEmbed({
              color: 0x3498DB,
              title: '🎭 Üye Rolleri Değişti',
              user: newM.user,
              description: `${newM} kullanıcısının rolleri güncellendi.\n${lines.join('\n')}`,
              fields: ex ? [{ name: 'İşlemi Yapan', value: `${ex}`, inline: true }] : [],
            }));
          }
        }
      } catch (e) { console.error('[MODLOG memberUpdate]', e.message); }
    });

    // ---- Kanal olayları ----
    const kanalLog = async (guild, key, title, color, desc, exType, targetId) => {
      try {
        const guard = await getGuard(guild.id);
        if (!guard.modlog.enabled || guard.modlog.events.kanal === false) return;
        const ex = exType ? await executorOf(guild, exType, targetId) : null;
        await sendModlog(guild, 'kanal', modlogEmbed({
          color, title, description: desc,
          fields: ex ? [{ name: 'İşlemi Yapan', value: `${ex}`, inline: true }] : [],
        }));
      } catch (e) { console.error('[MODLOG kanal]', e.message); }
    };

    client.on('channelCreate', async (ch) => {
      if (!ch.guild) return;
      await kanalLog(ch.guild, 'kanal', '➕ Kanal Oluşturuldu', 0x57F287, `**Kanal:** ${ch} (\`${ch.id}\`)\n**Tür:** \`${ch.type}\``, AuditLogEvent.ChannelCreate, ch.id);
    });
    client.on('channelDelete', async (ch) => {
      if (!ch.guild) return;
      await kanalLog(ch.guild, 'kanal', '➖ Kanal Silindi', 0xED4245, `**Kanal:** #${ch.name} (\`${ch.id}\`)`, AuditLogEvent.ChannelDelete, ch.id);
    });
    client.on('channelUpdate', async (oldCh, newCh) => {
      if (!newCh.guild) return;
      if (oldCh.name !== newCh.name) {
        await kanalLog(newCh.guild, 'kanal', '🔧 Kanal Güncellendi', 0xFEE75C, `**Kanal:** ${newCh}\n**Eski ad:** \`${oldCh.name}\` → **Yeni ad:** \`${newCh.name}\``, null, null);
      }
    });

    // ---- Ses hareketleri ----
    client.on('voiceStateUpdate', async (oldS, newS) => {
      try {
        const guild = newS.guild;
        const guard = await getGuard(guild.id);
        if (!guard.modlog.enabled || guard.modlog.events.ses === false) return;
        const user = newS.member?.user;
        if (!user || user.bot) return;
        if (!oldS.channel && newS.channel) {
          await sendModlog(guild, 'ses', modlogEmbed({
            color: 0x1ABC9C, title: '🎙️ Sese Katıldı', user,
            description: `${newS.member} → **${newS.channel.name}** kanalına katıldı.`,
          }));
        } else if (oldS.channel && !newS.channel) {
          await sendModlog(guild, 'ses', modlogEmbed({
            color: 0xE67E22, title: '👋 Sesten Ayrıldı', user,
            description: `${newS.member} → **${oldS.channel.name}** kanalından ayrıldı.`,
          }));
        } else if (oldS.channel && newS.channel && oldS.channel.id !== newS.channel.id) {
          await sendModlog(guild, 'ses', modlogEmbed({
            color: 0x3498DB, title: '🔀 Ses Kanalı Değiştirdi', user,
            description: `${newS.member} → **${oldS.channel.name}** ➜ **${newS.channel.name}**`,
          }));
        }
      } catch (e) { console.error('[MODLOG ses]', e.message); }
    });
  },
};
