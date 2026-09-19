const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'yardım',
  description: 'Tüm komutları listeler.',
  aliases: ['help', 'h', 'komutlar'],
  async execute(message, args, client) {
    const { commands } = client;

    const genel = [];
    const bilgi = [];
    const moderasyon = [];
    const sistem = [];

    commands.forEach(cmd => {
      const item = `\`${config.prefix}${cmd.name}\` - ${cmd.description || 'Açıklama yok'}`;
      if (['temizle', 'at', 'yasakla'].includes(cmd.name)) {
        moderasyon.push(item);
      } else if (['kullanıcı', 'sunucu', 'avatar', 'ikon', 'ping'].includes(cmd.name)) {
        bilgi.push(item);
      } else if (['welcome', 'afk', 'rolelog', 'koruma', 'doğrula'].includes(cmd.name)) {
        sistem.push(item);
      } else {
        genel.push(item);
      }
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Komut Listesi')
      .setDescription(`Prefix: \`${config.prefix}\`\nToplam komut: **${commands.size}**`)
      .setTimestamp()
      .setFooter({ text: `İsteyen: ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

    if (genel.length > 0) embed.addFields({ name: 'Genel', value: genel.join('\n'), inline: false });
    if (bilgi.length > 0) embed.addFields({ name: 'Bilgi', value: bilgi.join('\n'), inline: false });
    if (moderasyon.length > 0) embed.addFields({ name: 'Moderasyon', value: moderasyon.join('\n'), inline: false });
    if (sistem.length > 0) embed.addFields({ name: 'Sistem', value: sistem.join('\n'), inline: false });

    message.reply({ embeds: [embed] });
  },
};