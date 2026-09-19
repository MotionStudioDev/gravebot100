const { EmbedBuilder } = require('discord.js');
const { afkStore } = require('../utils/store');

module.exports = {
  name: 'afk',
  description: 'AFK modunu açar/kapatır.',
  aliases: ['afk'],
  usage: '[sebep]',
  guildOnly: true,
  cooldown: 5,
  async execute(message, args) {
    const reason = args.join(' ') || 'Sebep belirtilmedi';

    const existing = await afkStore.get(message.guild.id, message.author.id);
    if (existing) {
      await afkStore.remove(message.guild.id, message.author.id);
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('AFK Kaldırıldı')
        .setDescription(`${message.author} artık AFK değil! Hoş geldin!`)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    await afkStore.set(message.guild.id, message.author.id, reason);

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle('AFK Modu Aktif')
      .setDescription(`${message.author} artık AFK!`)
      .addFields(
        { name: 'Sebep', value: reason, inline: true },
        { name: 'Başlangıç', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
      )
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};