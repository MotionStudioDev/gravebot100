module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`${client.user.tag} olarak giriş yapıldı!`);
    client.user.setActivity('g!yardım | ayhost.com.tr', { type: 0 });
  },
};
