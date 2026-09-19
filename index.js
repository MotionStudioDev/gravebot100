require('dotenv').config();
require('./keep_alive');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { connect, afkStore } = require('./utils/store');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User],
});

client.commands = new Collection();
client.cooldowns = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('name' in command && 'execute' in command) {
    client.commands.set(command.name, command);
  } else {
    console.log(`[UYARI] ${filePath} dosyasında "name" veya "execute" özelliği eksik.`);
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const afkData = await afkStore.get(message.guild?.id, message.author.id);
  if (afkData) {
    await afkStore.remove(message.guild.id, message.author.id);
    const timeSince = Math.floor((Date.now() - afkData.since) / 1000);
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('AFK Kaldırıldı')
      .setDescription(`${message.author} artık AFK değil! Hoş geldin!`)
      .addFields(
        { name: 'AFK Süresi', value: `<t:${Math.floor(afkData.since / 1000)}:R>`, inline: true },
      )
      .setTimestamp();
    message.reply({ embeds: [embed] }).catch(() => {});
  }

  if (message.mentions.users.size > 0) {
    for (const [, mentionedUser] of message.mentions.users) {
      const mentionedAfk = await afkStore.get(message.guild?.id, mentionedUser.id);
      if (mentionedAfk) {
        const embed = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('Bu Kullanıcı AFK')
          .setDescription(`**${mentionedUser.tag}** şu anda AFK!`)
          .addFields(
            { name: 'Sebep', value: mentionedAfk.reason || 'Belirtilmedi', inline: true },
            { name: 'AFK Olduğu', value: `<t:${Math.floor(mentionedAfk.since / 1000)}:R>`, inline: true },
          )
          .setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true }))
          .setTimestamp();
        message.reply({ embeds: [embed] }).catch(() => {});
      }
    }
  }

  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName)
    || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  if (command.guildOnly && message.channel.type === 'dm') {
    return message.reply('Bu komut sadece sunucularda kullanılabilir.');
  }

  if (command.args && !args.length) {
    let reply = `Bu komut argüman gerektiriyor, ${message.author}!`;
    if (command.usage) {
      reply += `\nKullanım: \`${config.prefix}${command.name} ${command.usage}\``;
    }
    return message.reply(reply);
  }

  const { cooldowns } = client;
  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;

  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.reply(`Lütfen \`${command.name}\` komutunu tekrar kullanmak için ${timeLeft.toFixed(1)} saniye bekleyin.`);
    }
  }

  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(error);
    await message.reply('Komut çalıştırılırken bir hata oluştu!');
  }
});

connect().then(() => {
  client.login(config.token);
}).catch(err => {
  console.error('[MONGO] Bağlantı hatası:', err.message);
  process.exit(1);
});