const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { verifySettings } = require('../utils/store');

async function getOrCreateVerifyRole(guild) {
  let role = guild.roles.cache.find(r => r.name === 'Doğrulanmış');
  if (!role) {
    try {
      role = await guild.roles.create({
        name: 'Doğrulanmış',
        color: 0x57F287,
        reason: 'Doğrulama sistemi için otomatik oluşturuldu',
      });
    } catch (err) {
      console.error('[VERIFY] Rol oluşturulamadı:', err.message);
      return null;
    }
  }
  return role;
}

module.exports = {
  name: 'doğrula',
  description: 'Doğrulama sistemini açar/kapatır.',
  aliases: ['verify', 'dogrula'],
  usage: '<aç|kapat>',
  args: true,
  guildOnly: true,
  cooldown: 10,
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
      return message.reply({
        components: [new ContainerBuilder()
          .setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> 🔒 **${message.guild.name}** Doğrulama Sistemi`)
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> ❌ **Yetki Hatası!**\n\n` +
              `> Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın.`
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const action = args[0].toLowerCase();
    const guild = message.guild;
    const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');

    if (action === 'kapat' || action === 'off') {
      await verifySettings.remove(guild.id);
      return message.reply({
        components: [new ContainerBuilder()
          .setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> 🔒 **${guild.name}** Doğrulama Sistemi`)
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> ⚙️ **Sistem Kapatıldı**\n\n` +
              `> Doğrulama sistemi devre dışı bırakıldı.\n` +
              `> Artık yeni üyeler otomatik olarak doğrulanmayacak.`
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (action !== 'aç' && action !== 'on') {
      return message.reply({
        components: [new ContainerBuilder()
          .setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> 🔒 **${guild.name}** Doğrulama Sistemi`)
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> 📖 **Kullanım**\n\n` +
              `> \`!doğrula aç\` — Sistemi aktif et\n` +
              `> \`!doğrula kapat\` — Sistemi devre dışı bırak`
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const role = await getOrCreateVerifyRole(guild);
    if (!role) {
      return message.reply({
        components: [new ContainerBuilder()
          .setAccentColor(0x2B2D31)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> 🔒 **${guild.name}** Doğrulama Sistemi`)
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `> ❌ **Rol Hatası!**\n\n` +
              `> Doğrulama rolü oluşturulamadı.\n` +
              `> Botun **Rolleri Yönet** yetkisi olduğundan emin ol.`
            )
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    await verifySettings.set(guild.id, {
      enabled: true,
      roleId: role.id,
      setBy: message.author.id,
      setAt: Date.now(),
    });

    return message.reply({
      components: [new ContainerBuilder()
        .setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`> 🔒 **${guild.name}** Doğrulama Sistemi`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> ⚙️ **Sistem Aktif Edildi!**\n\n` +
            `> Yeni üyeler DM üzerinden doğrulanacak.\n` +
            `> Kod doğruysa ${role} rolü verilecek.`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> 📋 **Nasıl Çalışır?**\n\n` +
            `> 1️⃣ Üye sunucuya katılır\n` +
            `> 2️⃣ DM'den 6 haneli kod gelir\n` +
            `> 3️⃣ Kodu girerek kendini doğrular\n` +
            `> 4️⃣ Doğrulama başarılıysa rol verilir`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> 📏 **Kurallar**\n\n` +
            `> ⏳ **Süre:** 30 saniye\n` +
            `> 🎯 **Hak:** 3 deneme\n` +
            `> ✅ **1. Deneme:** Hemen kod gönder\n` +
            `> ⚠️ **2. Deneme:** 20sn bekleme + uyarı\n` +
            `> 🚫 **3. Deneme:** Sunucudan at`
          )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};