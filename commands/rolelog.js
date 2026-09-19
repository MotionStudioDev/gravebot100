const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { logSettings } = require('../utils/store');

module.exports = {
  name: 'rolelog',
  description: 'Rol log kanalını ayarlar veya kapatır.',
  aliases: ['rl', 'log'],
  usage: '<#kanal | kapat>',
  args: true,
  guildOnly: true,
  cooldown: 10,
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!');
    }

    const input = args[0].toLowerCase();

    if (input === 'kapat' || input === 'off' || input === 'disable') {
      await logSettings.remove(message.guild.id);
      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('Rol Log Kapatıldı')
        .setDescription('Rol log sistemi başarıyla kapatıldı.')
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply('Bir kanal etiketleyin veya `kapat` yazarak logları devre dışı bırakın.\nÖrnek: `!rolelog #log-kanalı`');
    }

    await logSettings.set(message.guild.id, {
      logChannelId: channel.id,
      setBy: message.author.id,
      setAt: Date.now(),
    });

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('Rol Log Ayarlandı')
      .setDescription(`Log kanalı ${channel} olarak ayarlandı.`)
      .addFields(
        { name: 'Kanal', value: `${channel} (${channel.id})`, inline: true },
        { name: 'Ayarlayan', value: `${message.author.tag}`, inline: true },
      )
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};