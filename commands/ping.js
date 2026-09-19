module.exports = {
  name: 'ping',
  description: 'Botun gecikmesini gösterir.',
  aliases: ['p'],
  cooldown: 5,
  execute(message) {
    const sent = Date.now();
    message.reply('Pong!').then(msg => {
      msg.edit(`Pong! 🏓\nMesaj gecikmesi: ${Date.now() - sent}ms\nAPI gecikmesi: ${Math.round(message.client.ws.ping)}ms`);
    });
  },
};