const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'sunucu',
  description: 'Sunucu hakkında bilgi verir.',
  aliases: ['sunucu', 'server', 'si', 'sv'],
  guildOnly: true,
  cooldown: 5,
  async execute(message) {
    const guild = message.guild;

    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const categories = guild.channels.cache.filter(c => c.type === 4).size;

    const online = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = guild.memberCount - bots;

    const roles = guild.roles.cache
      .sort((a, b) => b.position - a.position)
      .map(r => r.toString())
      .slice(0, 20);

    const verificationLevels = {
      0: 'Yok',
      1: 'Düşük',
      2: 'Orta',
      3: 'Yüksek',
      4: 'En Yüksek',
    };

    const boostTiers = {
      0: 'Yok',
      1: 'Seviye 1',
      2: 'Seviye 2',
      3: 'Seviye 3',
    };

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'Sunucu Adı', value: guild.name, inline: true },
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Sahip', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Oluşturulma', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Üye Sayısı', value: `Toplam: ${guild.memberCount}\nİnsan: ${humans}\nBot: ${bots}\nÇevrimiçi: ${online}`, inline: true },
        { name: 'Kanallar', value: `Metin: ${textChannels}\nSes: ${voiceChannels}\nKategori: ${categories}`, inline: true },
        { name: 'Doğrulama Seviyesi', value: verificationLevels[guild.verificationLevel] || 'Bilinmiyor', inline: true },
        { name: 'Boost', value: `${boostTiers[guild.premiumTier] || 'Yok'} (${guild.premiumSubscriptionCount || 0})`, inline: true },
        { name: 'Özellikler', value: [
          guild.features.includes('VANITY_URL') ? 'Özel URL' : null,
          guild.features.includes('COMMUNITY') ? 'Topluluk' : null,
          guild.features.includes('PARTNERED') ? 'Ortak' : null,
          guild.features.includes('VERIFIED') ? 'Doğrulanmış' : null,
          guild.features.includes('BANNER') ? 'Banner' : null,
          guild.features.includes('ANIMATED_ICON') ? 'Animasyonlu İkon' : null,
        ].filter(Boolean).join(', ') || 'Yok', inline: false },
        { name: `Roller (${guild.roles.cache.size})`, value: roles.length > 0 ? roles.join(', ') : 'Yok', inline: false },
      )
      .setFooter({ text: `${guild.name} • ${message.author.tag}`, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    if (guild.bannerURL()) {
      embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
    }

    message.reply({ embeds: [embed] });
  },
};