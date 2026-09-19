module.exports = {
  name: 'temizle',
  description: 'Belirtilen miktarda mesaj siler.',
  aliases: ['clear', 'sil', 'purge'],
  usage: '<sayı>',
  args: true,
  guildOnly: true,
  cooldown: 10,
  async execute(message, args) {
    const amount = parseInt(args[0]) + 1;

    if (isNaN(amount)) {
      return message.reply('Geçerli bir sayı girin!');
    } else if (amount <= 1 || amount > 100) {
      return message.reply('1-99 arası bir sayı girin!');
    }

    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply('Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısınız!');
    }

    try {
      await message.channel.bulkDelete(amount, true);
      const reply = await message.channel.send(`${amount - 1} mesaj silindi!`);
      setTimeout(() => reply.delete(), 3000);
    } catch (error) {
      console.error(error);
      await message.channel.send('Mesajları silerken bir hata oluştu! (14 günden eski mesajlar silinemez)');
    }
  },
};