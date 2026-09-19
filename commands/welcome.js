const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { welcomeSettings } = require('../utils/store');

module.exports = {
  name: 'welcome',
  description: 'Hoşgeldin/Ayrılma kanalını ayarlar.',
  aliases: ['hg', 'welcome'],
  usage: '<#kanal | kapat>',
  args: true,
  guildOnly: true,
  cooldown: 10,
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('Yetki Hatası')
          .setDescription('Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın!')
          .setTimestamp(),
      ] });
    }

    const input = args[0].toLowerCase();

    if (input === 'kapat' || input === 'off') {
      await welcomeSettings.remove(message.guild.id);
      return message.reply({ embeds: [
        new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('Hoşgeldin Sistemi Kapatıldı')
          .setDescription('Hoşgeldin/AYrılma sistemi başarıyla devre dışı bırakıldı.')
          .setTimestamp(),
      ] });
    }

    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply({ embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('Hoşgeldin Sistemi')
          .setDescription('Bir kanal etiketleyin veya `kapat` yazarak devre dışı bırakın.')
          .addFields(
            { name: 'Kullanım', value: '`!welcome #kanal` - Hoşgeldin kanalını ayarla\n`!welcome kapat` - Sistemi kapat', inline: false },
            { name: 'Değişkenler', value: `{user} - Kullanıcı etiketi\n{user.id} - Kullanıcı ID\n{server} - Sunucu adı\n{membercount} - Üye sayısı`, inline: false },
          )
          .setTimestamp(),
      ] });
    }

    await welcomeSettings.set(message.guild.id, {
      channelId: channel.id,
      setBy: message.author.id,
      setAt: Date.now(),
      welcomeMessage: 'Sunucumaza hoş geldin {user}! 🎉',
      leaveMessage: '**{user}** sunucudan ayrıldı. 👋',
    });

    return message.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Hoşgeldin Sistemi Ayarlandı')
        .setDescription(`Hoşgeldin kanalı ${channel} olarak ayarlandı.`)
        .addFields(
          { name: 'Kanal', value: `${channel} (${channel.id})`, inline: true },
          { name: 'Ayarlayan', value: `${message.author.tag}`, inline: true },
        )
        .setFooter({ text: '!welcome-mesaj ile mesajları düzenleyebilirsin.' })
        .setTimestamp(),
    ] });
  },
};