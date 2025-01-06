// backend/bot.js
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const settings = require('./settings');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
});

client.once('ready', () => {
    console.log(`Бот вошёл как ${client.user.tag}`);
});

// Ваши обработчики событий...

client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
    console.error('Ошибка при подключении бота:', error);
});

module.exports = client;
