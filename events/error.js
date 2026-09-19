module.exports = {
  name: 'error',
  execute(error) {
    console.error('Discord.js hatası:', error);
  },
};