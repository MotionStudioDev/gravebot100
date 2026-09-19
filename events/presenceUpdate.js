const { EmbedBuilder } = require('discord.js');
const { roleStore, logSettings } = require('../utils/store');

module.exports = {
  name: 'presenceUpdate',
  async execute(oldPresence, newPresence, client) {
    const member = newPresence.member;
    if (!member) return;
    if (member.user.bot) return;

    const guild = member.guild;
    if (!guild) return;

    const settings = await logSettings.get(guild.id);
    if (!settings || !settings.logChannelId) return;

    const me = guild.members.me;
    if (!me) return;

    const oldStatus = oldPresence?.status || 'offline';
    const newStatus = newPresence?.status || 'offline';

    if (oldStatus === newStatus) return;

    console.log(`[PRESENCE] [${guild.name}] ${member.user.tag}: ${oldStatus} -> ${newStatus}`);

    const wasOffline = oldStatus === 'offline' || oldStatus === 'invisible';
    const isOnline = newStatus === 'online' || newStatus === 'idle' || newStatus === 'dnd';

    const wasOnline = oldStatus === 'online' || oldStatus === 'idle' || oldStatus === 'dnd';
    const isOffline = newStatus === 'offline' || newStatus === 'invisible';

    if (wasOffline && isOnline) {
      console.log(`[PRESENCE] [${guild.name}] ${member.user.tag} aktif oldu, roller kontrol ediliyor...`);
      const savedData = await roleStore.get(guild.id, member.id);
      if (savedData && savedData.roles.length > 0) {
        console.log(`[PRESENCE] [${guild.name}] ${savedData.roles.length} rol kayıtlı, geri veriliyor...`);
        const rolesToRestore = savedData.roles
          .map(id => guild.roles.cache.get(id))
          .filter(role => role && role.id !== guild.id && role.comparePositionTo(me.roles.highest) < 0);

        const highRoles = savedData.roles
          .map(id => guild.roles.cache.get(id))
          .filter(role => role && role.comparePositionTo(me.roles.highest) >= 0);

        if (highRoles.length > 0) {
          console.log(`[PRESENCE] [${guild.name}] Uyarı: ${highRoles.map(r => r.name).join(', ')} rolleri botunkinden yüksek, atlanıyor`);
        }

        if (rolesToRestore.length > 0) {
          try {
            await member.roles.add(rolesToRestore, 'Çevrimiçi - Roller geri verildi');
            console.log(`[PRESENCE] [${guild.name}] ${member.user.tag} - ${rolesToRestore.length} rol geri verildi`);
            await roleStore.remove(guild.id, member.id);

            try {
              const user = await client.users.fetch(member.id).catch(() => null);
              if (user) {
                await user.send({
                  embeds: [
                    new EmbedBuilder()
                      .setColor(0x57F287)
                      .setTitle(`${guild.name} - Roller Geri Verildi`)
                      .setDescription(`Tekrar aktif olduğun için **${guild.name}** sunucusundaki rollerin sana geri verildi.`)
                      .addFields(
                        { name: 'Geri Verilen Roller', value: rolesToRestore.map(r => r.name).join(', ') || 'Yok', inline: false },
                      )
                      .setTimestamp(),
                  ],
                });
                console.log(`[DM] ${member.user.tag} - DM gönderildi (roller geri verildi)`);
              }
            } catch (dmErr) {
              if (dmErr.message.includes('Cannot send messages to this user')) {
                console.log(`[DM] ${member.user.tag} - DM gönderilemedi: Kullanıcının DM'leri kapalı`);
              } else if (dmErr.message.includes('no mutual guilds')) {
                console.log(`[DM] ${member.user.tag} - DM gönderilemedi: Kullanıcı ile ortak sunucu yok`);
              } else {
                console.log(`[DM] ${member.user.tag} - DM gönderilemedi: ${dmErr.message}`);
              }
            }

            await sendLog(guild, client, {
              color: 0x57F287,
              title: '🟢 Üye Çevrimiçi - Roller Geri Verildi',
              description: `**${member.user.tag}** tekrar aktif oldu ve rolleri geri verildi.`,
              fields: [
                { name: 'Kullanıcı', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: 'Geri Verilen Roller', value: rolesToRestore.map(r => r.toString()).join(', ') || 'Yok', inline: false },
              ],
              thumbnail: member.user.displayAvatarURL({ dynamic: true }),
            });
          } catch (err) {
            console.error(`[ROLE RESTORE] [${guild.name}] Roller geri verilemedi (${member.user.tag}):`, err.message);
          }
        } else {
          console.log(`[PRESENCE] [${guild.name}] ${member.user.tag} - Geri verilecek uygun rol yok, kayıt temizleniyor`);
          await roleStore.remove(guild.id, member.id);
        }
      } else {
        console.log(`[PRESENCE] [${guild.name}] ${member.user.tag} - Kayıtlı rol yok`);
      }
    }

    if (wasOnline && isOffline) {
      console.log(`[PRESENCE] [${guild.name}] ${member.user.tag} çevrimdışı oldu, roller alınıyor...`);

      const memberRoles = member.roles.cache
        .filter(role => role.id !== guild.id && role.comparePositionTo(me.roles.highest) < 0)
        .map(role => role.id);

      const skippedRoles = member.roles.cache
        .filter(role => role.id !== guild.id && role.comparePositionTo(me.roles.highest) >= 0)
        .map(role => role);

      if (skippedRoles.length > 0) {
        console.log(`[PRESENCE] [${guild.name}] Uyarı: ${skippedRoles.map(r => r.name).join(', ')} rolleri botunkinden yüksek, alınamaz`);
      }

      if (memberRoles.length > 0) {
        const rolesToRemove = memberRoles
          .map(id => guild.roles.cache.get(id))
          .filter(Boolean);

        try {
          await member.roles.remove(rolesToRemove, 'Çevrimdışı - Roller kaydedildi');
          console.log(`[PRESENCE] [${guild.name}] ${member.user.tag} - ${rolesToRemove.length} rol alındı`);

          await roleStore.save(guild.id, member.id, memberRoles);

          try {
            const user = await client.users.fetch(member.id).catch(() => null);
            if (user) {
              await user.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle(`${guild.name} - Roller Alındı`)
                    .setDescription(`Çevrimdışı olduğun için **${guild.name}** sunucusundaki rollerin alındı.\nTekrar aktif olduğunda rollerin sana geri verilecek.`)
                    .addFields(
                      { name: 'Alınan Roller', value: rolesToRemove.map(r => r.name).join(', ') || 'Yok', inline: false },
                    )
                    .setTimestamp(),
                ],
              });
              console.log(`[DM] ${member.user.tag} - DM gönderildi (roller alındı)`);
            }
          } catch (dmErr) {
            if (dmErr.message.includes('Cannot send messages to this user')) {
              console.log(`[DM] ${member.user.tag} - DM gönderilemedi: Kullanıcının DM'leri kapalı`);
            } else if (dmErr.message.includes('no mutual guilds')) {
              console.log(`[DM] ${member.user.tag} - DM gönderilemedi: Kullanıcı ile ortak sunucu yok`);
            } else {
              console.log(`[DM] ${member.user.tag} - DM gönderilemedi: ${dmErr.message}`);
            }
          }

          await sendLog(guild, client, {
            color: 0xED4245,
            title: '🔴 Üye Çevrimdışı - Roller Alındı',
            description: `**${member.user.tag}** çevrimdışı olduğu için rolleri alındı.`,
            fields: [
              { name: 'Kullanıcı', value: `${member.user.tag} (${member.id})`, inline: true },
              { name: 'Alınan Roller', value: rolesToRemove.map(r => r.toString()).join(', ') || 'Yok', inline: false },
              ...(skippedRoles.length > 0 ? [{ name: 'Atlanan Roller (Yüksek)', value: skippedRoles.map(r => r.toString()).join(', '), inline: false }] : []),
            ],
            thumbnail: member.user.displayAvatarURL({ dynamic: true }),
          });
        } catch (err) {
          console.error(`[ROLE SAVE] [${guild.name}] Roller alınamadı (${member.user.tag}):`, err.message);
        }
      } else {
        console.log(`[PRESENCE] [${guild.name}] ${member.user.tag} - Alınacak uygun rol yok`);
      }
    }
  },
};

async function sendLog(guild, client, data) {
  const settings = await logSettings.get(guild.id);
  if (!settings || !settings.logChannelId) return;

  const logChannel = guild.channels.cache.get(settings.logChannelId);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(data.color)
    .setTitle(data.title)
    .setDescription(data.description)
    .addFields(data.fields)
    .setTimestamp();

  if (data.thumbnail) embed.setThumbnail(data.thumbnail);

  logChannel.send({ embeds: [embed] }).catch(() => {});
}