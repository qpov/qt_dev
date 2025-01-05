// server/index.js

require('dotenv').config(); // Загрузка переменных окружения

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Client, Intents, Collection, GatewayIntentBits, Events, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Инициализация Express приложения
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Путь к конфигурационному файлу
const CONFIG_PATH = path.join(__dirname, 'config.json');

// Функции для работы с конфигурацией
function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 4));
    }
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4));
}

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
        logger.error(`Ошибка при выполнении команды ${interaction.commandName}: ${error.stack}`);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply('Произошла ошибка при выполнении команды.');
        } else {
            await interaction.reply({ content: 'Произошла ошибка при выполнении команды.', ephemeral: true });
        }
    }
});

// Логин бота
client.login(process.env.BOT_TOKEN);

// Маршрут для проверки статуса бота
app.get('/api/status', (req, res) => {
    const status = client.isReady() ? 'Бот работает' : 'Бот не запущен';
    res.json({ status });
});

// Маршрут для отправки команды боту
app.post('/api/send-command', async (req, res) => {
    const { command } = req.body;

    if (!command) {
        logger.warn('Нет команды для отправки');
        return res.status(400).json({ success: false, error: 'Нет команды для отправки' });
    }

    // Здесь вы можете определить, как команда будет обрабатываться ботом
    // Например, отправить сообщение в определенный канал или вызвать команду напрямую

    try {
        // Пример: Отправка сообщения в основной канал (CHANNEL_ID)
        const channelId = process.env.CHANNEL_ID;
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            logger.warn(`Канал с ID ${channelId} не найден`);
            return res.status(404).json({ success: false, error: 'Канал не найден' });
        }

        await channel.send(`Команда: ${command}`);
        logger.info(`Команда "${command}" отправлена в канал ID: ${channelId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error(`Ошибка при отправке команды: ${error.stack}`);
        res.status(500).json({ success: false, error: 'Не удалось отправить команду' });
    }
});

// Маршрут для отправки сообщения в определенный сервер
app.post('/api/send-message', async (req, res) => {
    const { guildId, message } = req.body;

    if (!guildId || !message) {
        logger.warn('Недостаточно данных для отправки сообщения');
        return res.status(400).json({ success: false, error: 'Необходимо указать guildId и сообщение' });
    }

    // Получение channelId из config.json
    const config = loadConfig();
    const guildConfig = config[guildId];
    if (!guildConfig || !guildConfig.createRoomChannelId) {
        logger.warn(`Канал для guildId ${guildId} не настроен`);
        return res.status(404).json({ success: false, error: 'Канал для данного сервера не настроен' });
    }

    const channelId = guildConfig.createRoomChannelId;
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
        logger.warn(`Канал с ID ${channelId} не найден`);
        return res.status(404).json({ success: false, error: 'Канал не найден' });
    }

    try {
        await channel.send(message);
        logger.info(`Сообщение "${message}" отправлено в канал ID: ${channelId} на сервере ${guildId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error(`Ошибка при отправке сообщения: ${error.stack}`);
        res.status(500).json({ success: false, error: 'Не удалось отправить сообщение' });
    }
});

// Запуск Express сервера
app.listen(PORT, () => {
    logger.info(`Express сервер запущен на порту ${PORT}`);
});
