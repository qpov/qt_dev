// backend/bot.js
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});

client.once('ready', () => {
    console.log(`Бот вошёл как ${client.user.tag}`);
});

// Временно добавьте логирование для проверки токена
console.log('Discord Bot Token:', process.env.DISCORD_BOT_TOKEN);

client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
    console.error('Ошибка при подключении бота:', error);
});

module.exports = client;
