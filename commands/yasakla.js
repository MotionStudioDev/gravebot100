const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');

const ACCENT = 0x2B2D31;

function panel(title, body, color) {
  const c = new ContainerBuilder()
    .setAccentColor(color || ACCENT)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83D\uDEAB **' + title + '**'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

module.exports = {
  name: 'yasakla',
  description: 'Bir uyeyi sunucudan yasaklar.',
  aliases: ['ban'],
  usage: '<@uye | id> [sebep]',
  args: true,
  guildOnly: true,
  cooldown: 5,
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply(panel('Yetki Hatas', '> \uD83D\uDEAB Bu komut icin **Uyeleri Yasakla** yetkisi gerekir.'));
    }

    const raw = args[0] ? args[0].replace(/[<@!>]/g, '') : '';
    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

    let member;
    try {
      member = await message.guild.members.fetch(raw);
    } catch {
      const user = await message.client.users.fetch(raw).catch(() => null);
      if (user) {
        const alreadyBanned = await message.guild.bans.fetch(raw).catch(() => null);
        if (alreadyBanned) {
          return message.reply(panel('Zaten Yasakli', '> \uD83D\uDEAB **' + user.tag + '** (`' + user.id + '`) zaten yasakli.'));
        }

        const banContainer = new ContainerBuilder()
          .setAccentColor(0xFEE75C)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('> \u26A0\uFE0F **Onay Gerekli**')
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              '> **' + user.tag + '** (`' + user.id + '`) sunucudan yasaklanacak.\n' +
              '> _(Sunucuda degil, ID ile yasaklama)_\n\n' +
              '> \uD83D\uDCDD **Sebep:** ' + reason + '\n' +
              '> \uD83D\uDC64 **Yasaklayan:** ' + message.author + '\n\n' +
              '> \u23F3 **Sure:** 30 saniye'
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ban_confirm_' + message.id)
            .setLabel('Evet, Yasakla')
            .setEmoji('\uD83D\uDEAB')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('ban_cancel_' + message.id)
            .setLabel('Hayir, Iptal')
            .setEmoji('\u274C')
            .setStyle(ButtonStyle.Secondary),
        );

        const confirmMsg = await message.reply({
          components: [banContainer, buttons],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => null);

        if (!confirmMsg) return;

        const filter = (i) => i.user.id === message.author.id;
        const collector = confirmMsg.createMessageComponentCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async (interaction) => {
          if (interaction.customId === 'ban_confirm_' + message.id) {
            await interaction.deferUpdate().catch(() => {});
            try {
              await message.guild.members.ban(raw, { reason });
              const sc = new ContainerBuilder()
                .setAccentColor(0x57F287)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \u2705 **Uye Yasaklandi**'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                  '> **' + user.tag + '** (`' + user.id + '`) sunucudan yasaklandi.\n\n' +
                  '> \uD83D\uDCDD **Sebep:** ' + reason + '\n' +
                  '> \uD83D\uDC64 **Yasaklayan:** ' + message.author
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));
              await confirmMsg.edit({ components: [sc], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
            } catch (err) {
              console.error('[BAN]', err.message);
              await confirmMsg.edit(panel('Hata', '> \uD83D\uDEAB Yasaklanirken hata: ' + err.message, 0xED4245)).catch(() => {});
            }
            return;
          }
          if (interaction.customId === 'ban_cancel_' + message.id) {
            await interaction.deferUpdate().catch(() => {});
            const cc = new ContainerBuilder()
              .setAccentColor(ACCENT)
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \u274C **Islem Iptal Edildi**'))
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('> **' + user.tag + '** icin yasaklama iptal edildi.'))
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));
            await confirmMsg.edit({ components: [cc], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
          }
        });

        collector.on('end', async (collected, reason2) => {
          if (reason2 === 'interactionCreate') return;
          const tc = new ContainerBuilder()
            .setAccentColor(0xED4245)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \u23F0 **Sure Doldu**'))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> **' + user.tag + '** icin onay suresi doldu. Islem iptal edildi.'))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));
          await confirmMsg.edit({ components: [tc], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        });
        return;
      }
      return message.reply(panel('Uye Bulunamadi', '> \uD83D\uDD0E **`' + raw + '`** ID ile sunucuda uye bulunamadi.\n> Dogru ID girdiginden emin ol.'));
    }

    if (member.user.id === message.author.id) {
      return message.reply(panel('Hata', '> \uD83D\uDEAB Kendini yasaklayamazsin!'));
    }

    if (member.user.id === message.client.user.id) {
      return message.reply(panel('Hata', '> \uD83D\uDEAB Bot kendini yasaklayamaz!'));
    }

    if (!member.bannable) {
      return message.reply(panel('Hata', '> \uD83D\uDEAB **' + member.user.tag + '** yasaklanamaz! (Rol hiyerarsisi veya yetki yetersiz.)'));
    }

    const roles = member.roles.cache
      .filter(r => r.id !== message.guild.id)
      .map(r => r.toString())
      .join(', ') || 'Yok';

    const confirmContainer = new ContainerBuilder()
      .setAccentColor(0xFEE75C)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('> \u26A0\uFE0F **Onay Gerekli**')
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '> **' + member.user.tag + '** (`' + member.user.id + '`) sunucudan yasaklanacak.\n\n' +
          '> \uD83D\uDCCB **Rolleri:** ' + roles + '\n' +
          '> \uD83D\uDCC5 **Katilma:** ' + (member.joinedAt ? '<t:' + Math.floor(member.joinedTimestamp / 1000) + ':R>' : 'Bilinmiyor') + '\n' +
          '> \uD83D\uDCDD **Sebep:** ' + reason + '\n' +
          '> \uD83D\uDC64 **Yasaklayan:** ' + message.author + '\n\n' +
          '> \u23F3 **Sure:** 30 saniye'
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ban_confirm_' + message.id)
        .setLabel('Evet, Yasakla')
        .setEmoji('\uD83D\uDEAB')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('ban_cancel_' + message.id)
        .setLabel('Hayir, Iptal')
        .setEmoji('\u274C')
        .setStyle(ButtonStyle.Secondary),
    );

    const confirmMsg = await message.reply({
      components: [confirmContainer, buttons],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => null);

    if (!confirmMsg) return;

    const filter = (i) => i.user.id === message.author.id;
    const collector = confirmMsg.createMessageComponentCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'ban_confirm_' + message.id) {
        await interaction.deferUpdate().catch(() => {});

        try {
          await member.ban({ reason });

          const successContainer = new ContainerBuilder()
            .setAccentColor(0x57F287)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('> \u2705 **Uye Yasaklandi**')
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                '> **' + member.user.tag + '** (`' + member.user.id + '`) sunucudan yasaklandi.\n\n' +
                '> \uD83D\uDCDD **Sebep:** ' + reason + '\n' +
                '> \uD83D\uDC64 **Yasaklayan:** ' + message.author
              )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));

          await confirmMsg.edit({ components: [successContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        } catch (err) {
          console.error('[BAN]', err.message);
          await confirmMsg.edit(panel('Hata', '> \uD83D\uDEAB Uye yasaklanirken hata olustu: ' + err.message, 0xED4245)).catch(() => {});
        }
        return;
      }

      if (interaction.customId === 'ban_cancel_' + message.id) {
        await interaction.deferUpdate().catch(() => {});

        const cancelContainer = new ContainerBuilder()
          .setAccentColor(ACCENT)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('> \u274C **Islem Iptal Edildi**')
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('> **' + member.user.tag + '** icin yasaklama iptal edildi.')
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));

        await confirmMsg.edit({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }
    });

    collector.on('end', async (collected, reason2) => {
      if (reason2 === 'interactionCreate') return;

      const timeoutContainer = new ContainerBuilder()
        .setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('> \u23F0 **Sure Doldu**')
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('> **' + member.user.tag + '** icin onay suresi doldu. Islem iptal edildi.')
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));

      await confirmMsg.edit({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    });
  },
};
