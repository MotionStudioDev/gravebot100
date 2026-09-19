const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'ikon',
  description: 'Sunucunun ikonunu gösterir.',
  aliases: ['icon', 'servericon', 'svikon'],
  guildOnly: true,
  cooldown: 5,
  async execute(message) {
    const guild = message.guild;
    if (!guild.iconURL()) {
      return message.reply({ embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('İkon Yok')
          .setDescription('Bu sunucunun bir ikonu yok.')
          .setTimestamp(),
      ] });
    }

    const iconURL = guild.iconURL({ dynamic: true, size: 1024 });
    const iconURL_png = guild.iconURL({ extension: 'png', size: 1024 });
    const iconURL_jpg = guild.iconURL({ extension: 'jpg', size: 1024 });
    const iconURL_webp = guild.iconURL({ extension: 'webp', size: 1024 });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${guild.name} - İkon`)
      .setImage(iconURL)
      .setFooter({ text: `${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    const components = [];
    if (guild.iconURL({ extension: 'gif' })) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('PNG')
          .setURL(iconURL_png)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel('JPG')
          .setURL(iconURL_jpg)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel('WEBP')
          .setURL(iconURL_webp)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel('GIF')
          .setURL(guild.iconURL({ extension: 'gif', size: 1024 }))
          .setStyle(ButtonStyle.Link),
      );
      components.push(row);
    } else {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('PNG')
          .setURL(iconURL_png)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel('JPG')
          .setURL(iconURL_jpg)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel('WEBP')
          .setURL(iconURL_webp)
          .setStyle(ButtonStyle.Link),
      );
      components.push(row);
    }

    message.reply({ embeds: [embed], components });
  },
};