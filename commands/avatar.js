const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'avatar',
  description: 'Kullanıcının avatarını gösterir.',
  aliases: ['av', 'pp', 'profilfoto'],
  usage: '[@kullanıcı]',
  cooldown: 5,
  async execute(message, args) {
    const user = message.mentions.users.first() || message.author;

    const avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });
    const avatarURL_png = user.displayAvatarURL({ extension: 'png', size: 1024 });
    const avatarURL_jpg = user.displayAvatarURL({ extension: 'jpg', size: 1024 });
    const avatarURL_webp = user.displayAvatarURL({ extension: 'webp', size: 1024 });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${user.tag} - Avatar`)
      .setImage(avatarURL)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('PNG')
        .setURL(avatarURL_png)
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('JPG')
        .setURL(avatarURL_jpg)
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('WEBP')
        .setURL(avatarURL_webp)
        .setStyle(ButtonStyle.Link),
    );

    message.reply({ embeds: [embed], components: [row] });
  },
};