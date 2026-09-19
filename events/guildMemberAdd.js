const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { verifySettings, welcomeSettings } = require('../utils/store');
const { generateCode, createCaptchaImage, isCanvasAvailable } = require('../utils/captcha');
const { getGuard, trackJoin, pruneJoins, sendModlog, modlogEmbed } = require('../utils/guard');

async function lockGuild(guild) {
  const everyone = guild.roles.everyone;
  let count = 0;
  const { ChannelType } = require('discord.js');
  for (const [, ch] of guild.channels.cache) {
    try {
      if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
        await ch.permissionOverwrites.edit(everyone, { SendMessages: false });
        count++;
      } else if (ch.type === ChannelType.GuildVoice) {
        await ch.permissionOverwrites.edit(everyone, { Connect: false });
        count++;
      }
    } catch {}
  }
  return count;
}

async function unlockGuild(guild) {
  const everyone = guild.roles.everyone;
  const { ChannelType } = require('discord.js');
  for (const [, ch] of guild.channels.cache) {
    try {
      if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
        await ch.permissionOverwrites.edit(everyone, { SendMessages: null });
      } else if (ch.type === ChannelType.GuildVoice) {
        await ch.permissionOverwrites.edit(everyone, { Connect: null });
      }
    } catch {}
  }
}

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    if (member.user.bot) return;
    if (!member.guild) return;

    // ---- ANTI-RAID ----
    try {
      const guard = await getGuard(member.guild.id);
      if (guard.antiraid.enabled) {
        const rec = trackJoin(member.guild.id, member.id);
        pruneJoins(rec, guard.antiraid.seconds);
        if (rec.times.length >= guard.antiraid.limit && Date.now() >= rec.cooldownUntil) {
          rec.cooldownUntil = Date.now() + 60000;
          const recentIds = [...rec.ids];
          rec.ids = []; rec.times = [];
          const action = guard.antiraid.action;
          const count = recentIds.length;
          console.log('[ANTIRAID] ' + member.guild.name + ' - Raid: ' + count + ' kisi, ceza: ' + action);
          let detail = '';
          const me = member.guild.members.me;
          if (action === 'kilitle') {
            if (me && me.permissions.has(0x00000010)) {
              const locked = await lockGuild(member.guild);
              detail = 'Lockdown: ' + locked + ' kanal kilitlendi, ' + guard.antiraid.lockMin + ' dk.';
              rec.locked = true;
              setTimeout(async () => { await unlockGuild(member.guild); rec.locked = false; }, guard.antiraid.lockMin * 60000);
            } else {
              detail = 'Botun kanallari yonet yetkisi yok!';
            }
          } else {
            const perm = action === 'kick' ? 0x00000002 : 0x00000004;
            const canDo = me && me.permissions.has(perm);
            let done = 0;
            if (canDo) {
              for (const id of recentIds) {
                try {
                  const m = await member.guild.members.fetch(id).catch(() => null);
                  if (!m || m.user.bot) continue;
                  if (action === 'kick') await m.kick('Anti-raid');
                  else await m.ban({ reason: 'Anti-raid', deleteMessageSeconds: 3600 });
                  done++;
                } catch {}
              }
            }
            detail = (action === 'kick' ? 'Kick: ' : 'Ban: ') + done + ' kisi islem gordu.';
          }
          await sendModlog(member.guild, null, modlogEmbed({ color: 0xED4245, title: 'Raid Algilandi!', description: count + ' kisi / ' + guard.antiraid.seconds + 'sn\n' + detail }));
        }
      }
    } catch (e) { console.error('[ANTIRAID]', e.message); }

    // ---- HOSGELDIN ----
    try {
      const wSettings = await welcomeSettings.get(member.guild.id);
      if (wSettings && wSettings.channelId) {
        const channel = member.guild.channels.cache.get(wSettings.channelId);
        if (channel && channel.isTextBased()) {
          const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
          const container = new ContainerBuilder()
            .setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83D\uDD12 **' + member.guild.name + '** | 2026 Hosgeldin Sistemi'))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83D\uDC4B **' + member.user.username + '** sunucuya katildi!\n> Toplam uye: **' + member.guild.memberCount + '**'))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83C\uDF89 Hos geldin!'));
          await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        }
      }
    } catch (e) { console.error('[WELCOME]', e.message); }

    // ---- DOGRULAMA ----
    try {
      const settings = await verifySettings.get(member.guild.id);
      if (!settings || !settings.enabled || !settings.roleId) return;

      let dmChannel;
      try {
        dmChannel = await member.createDM();
      } catch (err) {
        console.log('[VERIFY] ' + member.user.tag + ' - DM acilamadi: ' + err.message);
        return;
      }

      const attemptsData = { max: 3, used: 0 };

      async function sendCaptcha(timeLimit) {
        attemptsData.used++;
        const code = generateCode(6);
        const progress = '\u2588'.repeat(attemptsData.used) + '\u2591'.repeat(attemptsData.max - attemptsData.used);
        const remaining = attemptsData.max - attemptsData.used;

        const imageBuffer = createCaptchaImage(code);
        
        let msg;
        if (imageBuffer) {
          const attachment = new AttachmentBuilder(imageBuffer, { name: 'captcha.png' });
          const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('\uD83D\uDD12 ' + member.guild.name + ' | 2026 Dogrulama Sistemi')
            .setDescription(
              '> \uD83D\uDC4B Merhaba **' + member.user.username + '**!\n' +
              '> Sunucumuza hos geldin. Asagidaki kodu girerek kendini dogrula.\n\n' +
              '> \uD83C\uDFAF **Kalan Hak:** ' + remaining + ' / ' + attemptsData.max + '\n' +
              '> ' + progress + ' **' + attemptsData.used + '/' + attemptsData.max + '**\n' +
              '> \u23F3 **Sure:** ' + timeLimit + ' saniye\n\n' +
              '> Kodu buraya yazarak **Enter** tusuna bas.'
            )
            .setImage('attachment://captcha.png');
          msg = await dmChannel.send({ embeds: [embed], files: [attachment] }).catch(() => null);
        } else {
          const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('\uD83D\uDD12 ' + member.guild.name + ' | 2026 Dogrulama Sistemi')
            .setDescription(
              '> \uD83D\uDC4B Merhaba **' + member.user.username + '**!\n' +
              '> Sunucumuza hos geldin. Asagidaki kodu girerek kendini dogrula.\n\n' +
              '> \uD83C\uDFAF **Kalan Hak:** ' + remaining + ' / ' + attemptsData.max + '\n' +
              '> ' + progress + ' **' + attemptsData.used + '/' + attemptsData.max + '**\n' +
              '> \u23F3 **Sure:** ' + timeLimit + ' saniye\n\n' +
              '> **Dogrulama Kodu:**\n' +
              '```\n' + code + '\n```\n\n' +
              '> Kodu buraya yazarak **Enter** tusuna bas.'
            );
          msg = await dmChannel.send({ embeds: [embed] }).catch(() => null);
        }

        console.log('[VERIFY] ' + member.user.tag + ' - Captcha #' + attemptsData.used + ', kod: ' + code);
        if (!msg) return null;

        return new Promise((resolve) => {
          let done = false;
          const filter = (m) => m.author.id === member.id;
          const collector = dmChannel.createMessageCollector({ filter, time: timeLimit * 1000 });
          collector.on('collect', async (collected) => {
            if (done) return;
            const input = collected.content.trim().toUpperCase();
            console.log('[VERIFY] ' + member.user.tag + ' - Girdi: "' + input + '" vs Kod: "' + code + '"');
            if (input === code) {
              done = true;
              collector.stop('success');
              const role = member.guild.roles.cache.get(settings.roleId);
              if (role) await member.roles.add(role, 'Dogrulama basarili').catch(() => {});
              const { ContainerBuilder: CB, TextDisplayBuilder: TD, SeparatorBuilder: SB, MessageFlags: MF } = require('discord.js');
              const sc = new CB().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TD().setContent('> \uD83D\uDD12 **' + member.guild.name + '** | 2026 Dogrulama Sistemi'))
                .addSeparatorComponents(new SB().setDivider(true).setSpacing(1))
                .addTextDisplayComponents(new TD().setContent('> \u2705 **Dogrulama Basarili!**\n\n> Hos geldin **' + member.user.username + '**!\n> Artik **' + member.guild.name + '** sunucusuna erisimin var.\n> Iyi eglenceler!'))
                .addSeparatorComponents(new SB().setDivider(true).setSpacing(1))
                .addTextDisplayComponents(new TD().setContent('> \uD83C\uDFAF **Sonuc:** ' + attemptsData.used + '/' + attemptsData.max + ' denemede basardin!'));
              await msg.edit({ embeds: [], components: [sc], files: [], flags: MF.IsComponentsV2 }).catch(() => {});
              resolve('success');
              return;
            }
            done = true;
            collector.stop('wrong');
            resolve('wrong');
          });
          collector.on('end', async (msgs, reason) => {
            console.log('[VERIFY] ' + member.user.tag + ' - Collector bitti, reason: ' + reason + ', done: ' + done);
            if (!done && reason === 'time') resolve('timeout');
          });
        });
      }

      function warnMsg(type, remaining, used, max) {
        const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
        const progress = '\u2588'.repeat(used) + '\u2591'.repeat(remaining);
        return {
          components: [new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83D\uDD12 **' + member.guild.name + '** | 2026 Dogrulama Sistemi'))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(type === 'timeout' ? '> \u23F3 **Sure Doldu!**' : '> \u274C **Yanlis Kod!**'))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83C\uDFAF **Kalan Hak:** ' + remaining + ' / ' + max + '\n> ' + progress + ' **' + used + '/' + max + '**\n> \u23F3 **Bekleme:** 20 saniye'))],
          flags: MessageFlags.IsComponentsV2,
        };
      }

      let result = await sendCaptcha(30);

      if (result === 'wrong' || result === 'timeout') {
        const rem = attemptsData.max - attemptsData.used;
        await dmChannel.send(warnMsg(result, rem, attemptsData.used, attemptsData.max)).catch(() => {});
        await new Promise(r => setTimeout(r, 20000));
        result = await sendCaptcha(30);
      }

      if (result === 'wrong' || result === 'timeout') {
        const rem = attemptsData.max - attemptsData.used;
        await dmChannel.send(warnMsg(result, rem, attemptsData.used, attemptsData.max)).catch(() => {});
        await new Promise(r => setTimeout(r, 20000));
        result = await sendCaptcha(30);
      }

      if (result === 'wrong' || result === 'timeout' || result === null) {
        const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
        const fc = new ContainerBuilder().setAccentColor(0x2B2D31)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83D\uDD12 **' + member.guild.name + '** | 2026 Dogrulama Sistemi'))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83D\uDEAB **Dogrulama Basarisiz!**\n\n> Tum haklarini kullandin.\n> **Sunucudan atiliyorsun...**'))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83C\uDFAF **Sonuc:** ' + attemptsData.used + '/' + attemptsData.max + ' deneme - Hicbiri basarili olmad.'));
        await dmChannel.send({ components: [fc], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        setTimeout(async () => { await member.kick('Dogrulama basarisiz - 3 hak doldu').catch(() => {}); }, 3000);
      }
    } catch (e) { console.error('[VERIFY]', e.message); }
  },
};
