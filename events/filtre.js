const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { getGuard, findBadWord, findAd, isBypass, sendModlog, modlogEmbed, guardWarns } = require('../utils/guard');

function warnPanel(kind, user, detail, extra) {
  const c = new ContainerBuilder()
    .setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83D\uDEE1\uFE0F **Koruma \u2022 ' + kind + ' Engellendi**'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      '> ' + user + ', bu sunucuda **' + kind.toLocaleLowerCase('tr') + '** yasaktir.\n> Tespit: `' + detail + '`' + (extra ? '\n' + extra : '')
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    try {
      if (!message.guild) return;
      // SADECE kendi botumuzu atla - diger bot hesaplarini ATLAMIYORUZ
      if (message.author.id === client.user.id) return;

      // Mesaj icerigi al (embeds icerisindeki linkleri de kontrol et)
      let content = message.content || '';
      if (!content && message.embeds && message.embeds.length > 0) {
        for (const embed of message.embeds) {
          if (embed.url) content += ' ' + embed.url;
          if (embed.description) content += ' ' + embed.description;
        }
      }
      if (!content.trim()) return;

      const guard = await getGuard(message.guild.id);

      // Member bilgisini al - bot hesaplari veya webhook icin null olabilir
      let member = message.member;
      if (!member) {
        member = await message.guild.members.fetch(message.author.id).catch(() => null);
      }

      // ---- REKLAM & DAVET KORUMASI (member olmasa bile calisir) ----
      if (guard.reklam.enabled) {
        // Bot hesaplari veya webhook ise bypass kontrolu yapma, direkt filtrele
        const shouldBypass = member ? isBypass(member, message.channel.id, guard.reklam) : false;

        if (!shouldBypass) {
          const hit = findAd(content, guard.reklam);
          if (hit) {
            console.log('[FILTRE] REKLAM TESPIT: ' + message.author.tag + ' (bot:' + message.author.bot + ') -> ' + hit.match);

            // Sunucunun kendi daveti mi kontrol et
            let isOwnInvite = false;
            if (hit.type === 'davet') {
              try {
                const guildInvites = await message.guild.invites.fetch().catch(() => null);
                if (guildInvites) {
                  for (const inv of guildInvites.values()) {
                    if (inv.code && hit.match.includes(inv.code)) {
                      isOwnInvite = true;
                      console.log('[FILTRE] Kendi sunucu daveti tespit edildi, atlanıyor. (Davet: ' + inv.code + ')');
                      break;
                    }
                  }
                }
                if (!isOwnInvite && message.guild.vanityURLCode) {
                  if (hit.match.includes(message.guild.vanityURLCode)) {
                    isOwnInvite = true;
                    console.log('[FILTRE] Kendi vanity URL tespit edildi, atlanıyor.');
                  }
                }
              } catch (e) {
                console.error('[FILTRE] Davet kontrolu sirasinda hata:', e.message);
              }
            }

            if (!isOwnInvite) {
              // Mesaji derhal sil
              await message.delete().catch((e) => {
                console.error('[FILTRE] Mesaj silinemedi:', e.code, e.message);
              });

              const isMassSpam = hit.count && hit.count >= 2;
              let action = guard.reklam.action || 'uyar';
              let extra = '';
              let count = 0;

              if (member) {
                if (isMassSpam && member.moderatable) {
                  await member.timeout(Math.max(guard.reklam.muteMin || 10, 60) * 60000, 'Toplu reklam / spam raid engellendi').catch((e) => console.log('Timeout basarisiz', e.message));
                  extra = '> 🚨 **Toplu Reklam / Raid Tespit Edildi!**\n> ⏳ Doğrudan **' + Math.max(guard.reklam.muteMin || 10, 60) + ' dakika** susturuldu.';
                } else if (action === 'uyar') {
                  count = await guardWarns.add(message.guild.id, message.author.id, 'reklam').catch(() => 1);
                  extra = '> Uyarı: **' + count + '/' + (guard.reklam.limit || 3) + '**' + (count >= (guard.reklam.limit || 3) ? '\n> 🚫 Limit doldu, susturuluyorsun!' : '');
                  if (count >= (guard.reklam.limit || 3) && member.moderatable) {
                    await member.timeout((guard.reklam.muteMin || 10) * 60000, 'Reklam uyarı limiti doldu').catch(() => {});
                    await guardWarns.reset(message.guild.id, message.author.id, 'reklam').catch(() => {});
                    extra += '\n> ⏳ Susturma: **' + (guard.reklam.muteMin || 10) + ' dakika**';
                  }
                } else if (action === 'mute') {
                  if (member.moderatable) {
                    await member.timeout((guard.reklam.muteMin || 10) * 60000, 'Reklam filtresi').catch(() => {});
                    extra = '> ⏳ Susturma: **' + (guard.reklam.muteMin || 10) + ' dakika**';
                  }
                }
              }

              const label = hit.type === 'davet' ? 'Sunucu Davet Linki' : 'Reklam / Bağlantı';
              const reply = await message.channel.send(warnPanel(label, '' + message.author, hit.match, extra)).catch((e) => {
                console.error('[FILTRE] WarnPanel gonderilemedi:', e.message);
                return null;
              });
              if (reply) {
                setTimeout(() => { reply.delete().catch(() => {}); }, 6000);
              }

              try {
                await sendModlog(message.guild, null, modlogEmbed({
                  color: 0xFEE75C,
                  title: '🔗 Reklam / Davet Linki Engellendi',
                  user: message.author,
                  description: '**Kanal:** ' + message.channel + '\n**Tür:** `' + (hit.type === 'davet' ? 'Discord Davet Linki' : 'Dış Bağlantı / Reklam') + '`\n**Tespit Edilen:** `' + hit.match + '`\n**Ceza:** `' + (isMassSpam ? 'Toplu Spam Mute' : action) + '`' + (count ? ' • Uyarı: ' + count + '/' + (guard.reklam.limit || 3) : ''),
                  fields: [{ name: 'Mesaj İçeriği', value: (content || '_boş_').slice(0, 1000) }],
                }));
              } catch (e) {
                console.error('[FILTRE] Modlog gonderilemedi:', e.message);
              }

              console.log('[FILTRE] REKLAM ENGELLENDI: ' + message.author.tag + ' -> ' + hit.match);
              return;
            } else {
               console.log('[FILTRE] Islem atlandi (isOwnInvite=true)');
            }
          }
        } else {
          console.log('[FILTRE] BYPASS: ' + message.author.tag + ' reklam filtresinden muaf');
        }
      }

      // ---- KUFUR (sadece gercek kullanicilar) ----
      if (!message.author.bot && member && guard.kufur.enabled && !isBypass(member, message.channel.id, guard.kufur)) {
        const hit = findBadWord(content, guard.kufur.extraWords, guard.kufur.removedWords);
        if (hit) {
          const action = guard.kufur.action;
          let extra = '';
          let count = 0;

          if (action === 'uyar') {
            count = await guardWarns.add(message.guild.id, message.author.id, 'kufur').catch(() => 1);
            extra = '> Uyari: **' + count + '/' + guard.kufur.limit + '**' + (count >= guard.kufur.limit ? '\n> \uD83D\uDEAB Limit doldu, susturuluyorsun!' : '');
            if (count >= guard.kufur.limit && member.moderatable) {
              await member.timeout(guard.kufur.muteMin * 60000, 'Kufur uyar limiti doldu').catch(() => {});
              await guardWarns.reset(message.guild.id, message.author.id, 'kufur').catch(() => {});
              extra += '\n> \u23F3 Susturma: **' + guard.kufur.muteMin + ' dakika**';
            }
          } else if (action === 'mute') {
            if (member.moderatable) {
              await member.timeout(guard.kufur.muteMin * 60000, 'Kufur filtresi').catch(() => {});
              extra = '> \u23F3 Susturma: **' + guard.kufur.muteMin + ' dakika**';
            }
          }

          await message.delete().catch(() => {});

          const reply = await message.channel.send(warnPanel('Kufur', '' + message.author, hit, extra)).catch(() => null);
          if (reply) {
            setTimeout(() => {
              reply.delete().catch(() => {});
            }, 8000);
          }

          await sendModlog(message.guild, null, modlogEmbed({
            color: 0xED4245,
            title: '\uD83D\uDEAB Kufur Engellendi',
            user: message.author,
            description: '**Kanal:** ' + message.channel + '\n**Tespit:** `' + hit + '`\n**Ceza:** `' + action + '`' + (count ? ' \u2022 Uyari: ' + count + '/' + guard.kufur.limit : ''),
            fields: [{ name: 'Mesaj Icerigi', value: (content || '_bos_').slice(0, 1000) }],
          }));
          return;
        }
      }
    } catch (err) {
      console.error('[FILTRE] HATA:', err.message, err.stack);
    }
  },
};
