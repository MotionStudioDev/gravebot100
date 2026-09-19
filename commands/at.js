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
  name: 'at',
  description: 'Bir uyeyi sunucudan atar.',
  aliases: ['kick'],
  usage: '<@uye | id> [sebep]',
  args: true,
  guildOnly: true,
  cooldown: 5,
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply(panel('Yetki Hatas', '> \uD83D\uDEAB Bu komut icin **Uyeleri At** yetkisi gerekir.'));
    }

    const raw = args[0] ? args[0].replace(/[<@!>]/g, '') : '';
    const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

    let member;
    try {
      member = await message.guild.members.fetch(raw);
    } catch {
      return message.reply(panel('Uye Bulunamadi', '> \uD83D\uDD0E **`' + raw + '`** ID ile sunucuda uye bulunamadi.\n> Dogru ID girdiginden emin ol.'));
    }

    if (member.user.id === message.author.id) {
      return message.reply(panel('Hata', '> \uD83D\uDEAB Kendini atamazsin!'));
    }

    if (member.user.id === message.client.user.id) {
      return message.reply(panel('Hata', '> \uD83D\uDEAB Bot kendini atamaz!'));
    }

    if (!member.kickable) {
      return message.reply(panel('Hata', '> \uD83D\uDEAB **' + member.user.tag + '** atilamaz! (Rol hiyerarsisi veya yetki yetersiz.)'));
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
          '> **' + member.user.tag + '** (`' + member.user.id + '`) sunucudan atilacak.\n\n' +
          '> \uD83D\uDCCB **Rolleri:** ' + roles + '\n' +
          '> \uD83D\uDCC5 **Katilma:** ' + (member.joinedAt ? '<t:' + Math.floor(member.joinedTimestamp / 1000) + ':R>' : 'Bilinmiyor') + '\n' +
          '> \uD83D\uDCDD **Sebep:** ' + reason + '\n' +
          '> \uD83D\uDC64 **Atan:** ' + message.author + '\n\n' +
          '> \u23F3 **Sure:** 30 saniye'
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kick_confirm_' + message.id)
        .setLabel('Evet, At')
        .setEmoji('\u2705')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('kick_cancel_' + message.id)
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
      if (interaction.customId === 'kick_confirm_' + message.id) {
        await interaction.deferUpdate().catch(() => {});

        try {
          await member.kick(reason);

          const successContainer = new ContainerBuilder()
            .setAccentColor(0x57F287)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('> \u2705 **Uye Atildi**')
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                '> **' + member.user.tag + '** (`' + member.user.id + '`) sunucudan atildi.\n\n' +
                '> \uD83D\uDCDD **Sebep:** ' + reason + '\n' +
                '> \uD83D\uDC64 **Atan:** ' + message.author
              )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));

          await confirmMsg.edit({ components: [successContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        } catch (err) {
          console.error('[AT]', err.message);
          await confirmMsg.edit(panel('Hata', '> \uD83D\uDEAB Uye atilirken hata olustu: ' + err.message, 0xED4245)).catch(() => {});
        }
        return;
      }

      if (interaction.customId === 'kick_cancel_' + message.id) {
        await interaction.deferUpdate().catch(() => {});

        const cancelContainer = new ContainerBuilder()
          .setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('> \u274C **Islem Iptal Edildi**')
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('> **' + member.user.tag + '** icin atma islemi iptal edildi.')
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));

        await confirmMsg.edit({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'interactionCreate') return;

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
