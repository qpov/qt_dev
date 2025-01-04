// index.js

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('qt работает!');
});

app.listen(PORT, () => {
    console.log(`Express сервер запущен на порту ${PORT}`);
});

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Создание клиента Discord с необходимыми интентами
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ]
});

// Коллекция для команд
client.commands = new Collection();

// Загрузка команд из папки commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Загрузка обработчиков событий из папки events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Обработка команд
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Ошибка при выполнении команды ${interaction.commandName}:`, error);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply('Произошла ошибка при выполнении команды.');
        } else {
            await interaction.reply({ content: 'Произошла ошибка при выполнении команды.', ephemeral: true });
        }
    }
});

// Логин бота
client.login(process.env.BOT_TOKEN);
