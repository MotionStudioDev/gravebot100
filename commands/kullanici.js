const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags,
  StringSelectMenuBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder,
} = require('discord.js');

module.exports = {
  name: 'kullanıcı',
  description: 'Kullanıcı hakkında bilgi verir.',
  aliases: ['kullanici', 'whois', 'ui', 'kişi'],
  usage: '[@kullanıcı]',
  guildOnly: true,
  cooldown: 5,
  async execute(message, args) {
    const user = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(user.id) || await message.guild.members.fetch(user.id).catch(() => null);

    const flags = user.flags?.toArray() || [];
    const flagLabels = {
      Staff: 'Discord Çalışanı',
      Partner: 'Discord Ortak',
      HypesquadEvents: 'HypeSquad',
      BugHunterLevel1: 'Bug Hunter',
      BugHunterLevel2: 'Golden Bug Hunter',
      HypeSquadBravery: 'HypeSquad Bravery',
      HypeSquadBrilliance: 'HypeSquad Brilliance',
      HypeSquadBalance: 'HypeSquad Balance',
      EarlySupporter: 'Erken Destekçi',
      VerifiedDeveloper: 'Doğrulanmış Geliştirici',
      CertifiedModerator: 'Sertifikalı Moderatör',
    };
    const userFlags = flags.filter(f => flagLabels[f]).map(f => flagLabels[f]);
    const badges = [...userFlags, user.bot ? 'Bot' : null].filter(Boolean);

    const statusEmojis = { online: '🟢', idle: '🟡', dnd: '🔴', offline: '⚫' };
    const statusText = { online: 'Çevrimiçi', idle: 'Boşta', dnd: 'Rahatsız Etmeyin', offline: 'Çevrimdışı' };
    const presenceStatus = member?.presence?.status || user.presence?.status || 'offline';
    const customStatus = member?.presence?.activities?.find(a => a.type === 4);
    const statusEmoji = statusEmojis[presenceStatus] || '⚫';
    const statusLabel = statusText[presenceStatus] || 'Çevrimdışı';

    const bannerURL = await user.fetch().then(u => u.bannerURL({ dynamic: true, size: 1024 })).catch(() => null);

    const roles = member?.roles?.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r.toString())
      .slice(0, 15) || [];
    const totalRoles = (member?.roles?.cache?.size || 1) - 1;

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('user_info_select')
        .setPlaceholder('Kullanıcı bilgilerini İncele')
        .addOptions([
          { label: 'Geri', description: 'Ana menüye dön', value: 'back', emoji: '◀️' },
          { label: 'Genel Bilgi', description: 'Kullanıcı adı, ID, hesap tarihi', value: 'general', emoji: 'ℹ️' },
          { label: 'Roller', description: 'Kullanıcının tüm rolleri', value: 'roles', emoji: '🏷️' },
          { label: 'Sunucu Bilgisi', description: 'Katılım tarihi, boost, nickname', value: 'server', emoji: '🏠' },
          { label: 'Banner', description: 'Kullanıcının banner resmi', value: 'banner', emoji: '🖼️' },
        ]),
    );

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('user_info_menu')
        .setLabel('Menü')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setLabel('Destek Sunucusu')
        .setURL('https://discord.gg/example')
        .setEmoji('🔗')
        .setStyle(ButtonStyle.Link),
    );

    const buildMainContainer = () => {
      const container = new ContainerBuilder()
        .setAccentColor(0x08ff00);

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ${user.tag}\n${badges.length > 0 ? badges.join(' • ') : '•'}\n${statusEmoji} ${statusLabel}${customStatus ? ` - ${customStatus.state}` : ''}`)
      );
      container.addSeparatorComponents(new SeparatorBuilder());
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Kullanıcı Adı:** \`${user.username}\`\n` +
          `**ID:** \`${user.id}\`\n` +
          `**Hesap Oluşturulma:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>\n` +
          (member ? `**Sunucuya Katılma:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n` : '') +
          (member?.nickname ? `**Takma İsim:** \`${member.nickname}\`\n` : '') +
          (member?.premiumSince ? `**Boost:** <t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>\n` : '') +
          `**Roller (${totalRoles}):** ${roles.length > 0 ? roles.join(', ') : 'Yok'}`
        )
      );
      container.addSeparatorComponents(new SeparatorBuilder());
      container.addActionRowComponents(buttonRow);
      container.addActionRowComponents(selectRow);

      return container;
    };

    const buildGeneralContainer = () => {
      const container = new ContainerBuilder()
        .setAccentColor(0x08ff00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ℹ️ ${user.tag} - Genel Bilgi`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Kullanıcı Adı:** \`${user.username}\`\n` +
            `**ID:** \`${user.id}\`\n` +
            `**Bot:** ${user.bot ? 'Evet' : 'Hayır'}\n` +
            `**Hesap Oluşturulma:** <t:${Math.floor(user.createdTimestamp / 1000)}:F>\n` +
            `**Badges:** ${badges.length > 0 ? badges.join(', ') : 'Yok'}`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(selectRow);
      return container;
    };

    const buildRolesContainer = () => {
      const container = new ContainerBuilder()
        .setAccentColor(0x08ff00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## 🏷️ ${user.tag} - Roller`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(roles.length > 0 ? roles.join(', ') : 'Rolü yok')
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Toplam:** ${totalRoles} rol`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(selectRow);
      return container;
    };

    const buildServerContainer = () => {
      if (!member) {
        const container = new ContainerBuilder()
          .setAccentColor(0xED4245)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## ❌ Üye Bulunamadı\nBu kullanıcı bu sunucuda değil.')
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addActionRowComponents(selectRow);
        return container;
      }
      const container = new ContainerBuilder()
        .setAccentColor(0x08ff00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## 🏠 ${user.tag} - Sunucu Bilgisi`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Takma İsim:** ${member.nickname ? `\`${member.nickname}\`` : 'Yok'}\n` +
            `**Katılma Tarihi:** <t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n` +
            `**Boost:** ${member.premiumSince ? `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>` : 'Hayır'}\n` +
            `**En Yüksek Rol:** ${member.roles.highest.id !== message.guild.id ? member.roles.highest.toString() : 'Yok'}`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(selectRow);
      return container;
    };

    const buildBannerContainer = () => {
      const container = new ContainerBuilder()
        .setAccentColor(0x08ff00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## 🖼️ ${user.tag} - Banner`)
        )
        .addSeparatorComponents(new SeparatorBuilder());

      if (bannerURL) {
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(bannerURL)
          )
        );
      } else {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Kullanıcının bannerı bulunmuyor.')
        );
      }

      container.addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(selectRow);
      return container;
    };

    const reply = await message.reply({
      components: [buildMainContainer()],
      flags: MessageFlags.IsComponentsV2,
    });

    const collector = reply.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: 'Bu menüyü sadece komutu kullanan kişi kullanabilir.', ephemeral: true });
      }

      if (interaction.customId === 'user_info_menu') {
        return interaction.update({
          components: [buildGeneralContainer()],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      if (interaction.customId === 'user_info_select') {
        const value = interaction.values[0];

        if (value === 'back') {
          return interaction.update({
            components: [buildMainContainer()],
            flags: MessageFlags.IsComponentsV2,
          });
        }

        const containers = {
          general: buildGeneralContainer,
          roles: buildRolesContainer,
          server: buildServerContainer,
          banner: buildBannerContainer,
        };
        const builder = containers[value];
        if (builder) {
          return interaction.update({
            components: [builder()],
            flags: MessageFlags.IsComponentsV2,
          });
        }
      }
    });

    collector.on('end', () => {
      reply.edit({
        components: [buildMainContainer()],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => {});
    });
  },
};