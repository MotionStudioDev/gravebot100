const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { welcomeSettings } = require('../utils/store');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    if (member.user.bot) return;

    const settings = await welcomeSettings.get(member.guild.id);
    if (!settings || !settings.channelId) return;

    const channel = member.guild.channels.cache.get(settings.channelId);
    if (!channel) return;

    const roles = member.roles.cache
      .filter(r => r.id !== member.guild.id)
      .map(r => r.toString())
      .join(', ') || 'Yok';

    const joinDate = member.joinedAt
      ? '<t:' + Math.floor(member.joinedTimestamp / 1000) + ':R>'
      : 'Bilinmiyor';

    const container = new ContainerBuilder()
      .setAccentColor(0x2B2D31)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83D\uDD12 **' + member.guild.name + '** | 2026 Hosgeldin Sistemi'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83D\uDC4B **' + member.user.username + '** sunucudan ayrildi!\n> Kalan uye: **' + (member.guild.memberCount - 1) + '**'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83D\uDCC5 **Katilma:** ' + joinDate + '\n> \uD83C\uDFAF **Rolleri:** ' + (roles.length > 150 ? roles.slice(0, 150) + '...' : roles)))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('> \uD83D\uDC4B Gorusuruz!'));

    channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  },
};
