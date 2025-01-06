// backend/bot.js
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const settings = require('./settings');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
});

const connections = new Map(); // Map для хранения голосовых подключений по guildId

client.once('ready', () => {
    console.log(`Бот вошёл как ${client.user.tag}`);
    initializeConnections();
    watchSettingsFile();
});

// Функция для инициализации подключений на основе текущих настроек
function initializeConnections() {
    const usersSettings = settings.getAllUserSettings();
    if (typeof usersSettings !== 'object' || usersSettings === null) {
        console.error('getAllUserSettings() вернул некорректное значение:', usersSettings);
        return;
    }

    Object.entries(usersSettings).forEach(([userId, userSetting]) => {
        const { guildId, voiceChannelId } = userSetting;
        connectToVoiceChannel(guildId, voiceChannelId);
    });
}

// Функция для подключения к голосовому каналу
function connectToVoiceChannel(guildId, voiceChannelId) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.log(`Гильдия с ID ${guildId} не найдена.`);
        return;
    }

    const voiceChannel = guild.channels.cache.get(voiceChannelId);
    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        console.log(`Голосовой канал с ID ${voiceChannelId} не найден или не является голосовым.`);
        return;
    }

    // Проверяем, есть ли уже подключение к этому каналу
    if (connections.has(guildId)) {
        console.log(`Бот уже подключён к голосовому каналу в гильдии ${guildId}.`);
        return;
    }

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
    });

    // Отслеживаем состояние подключения
    entersState(connection, VoiceConnectionStatus.Ready, 30_000)
        .then(() => {
            console.log(`Бот успешно подключился к голосовому каналу ${voiceChannel.name} в гильдии ${guild.name}.`);
            connections.set(guildId, connection);
        })
        .catch(error => {
            console.error(`Не удалось подключиться к голосовому каналу ${voiceChannel.name} в гильдии ${guild.name}:`, error);
            connection.destroy();
        });

    // Обработка разрыва подключения
    connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
            // Пере подключение произошло успешно
        } catch (error) {
            console.log(`Разрыв подключения к гильдии ${guild.name}. Удаляем подключение из карты.`);
            connections.delete(guildId);
            connection.destroy();
        }
    });
}

// Функция для отслеживания изменений в файле настроек
function watchSettingsFile() {
    const settingsFilePath = path.join(__dirname, 'settings.json');
    fs.watchFile(settingsFilePath, (curr, prev) => {
        console.log('Файл settings.json был изменён. Обновляем подключения...');
        updateConnections();
    });
}

// Функция для обновления подключений на основе изменений в настройках
function updateConnections() {
    const usersSettings = settings.getAllUserSettings();
    if (typeof usersSettings !== 'object' || usersSettings === null) {
        console.error('getAllUserSettings() вернул некорректное значение:', usersSettings);
        return;
    }

    const connectedGuilds = Array.from(connections.keys());

    // Подключаемся к новым голосовым каналам
    Object.entries(usersSettings).forEach(([userId, userSetting]) => {
        const { guildId, voiceChannelId } = userSetting;
        if (!connections.has(guildId)) {
            connectToVoiceChannel(guildId, voiceChannelId);
        } else {
            // Проверяем, изменился ли голосовой канал
            const connection = connections.get(guildId);
            const currentChannelId = connection.joinConfig.channelId;
            if (currentChannelId !== voiceChannelId) {
                console.log(`Голосовой канал для гильдии ${guildId} изменился. Переподключаемся...`);
                disconnectFromVoiceChannel(guildId);
                connectToVoiceChannel(guildId, voiceChannelId);
            }
        }
    });

    // Отключаемся от гильдий, которые больше не управляются
    connectedGuilds.forEach(guildId => {
        const isManaged = Object.values(usersSettings).some(userSetting => userSetting.guildId === guildId);
        if (!isManaged) {
            console.log(`Гильдия ${guildId} больше не управляется. Отключаемся...`);
            disconnectFromVoiceChannel(guildId);
        }
    });
}

// Функция для отключения от голосового канала
function disconnectFromVoiceChannel(guildId) {
    const connection = connections.get(guildId);
    if (connection) {
        connection.destroy();
        connections.delete(guildId);
        console.log(`Бот отключился от гильдии ${guildId}.`);
    }
}

// Обработка событий голосовых состояний (опционально)
client.on('voiceStateUpdate', (oldState, newState) => {
    // Пример: логирование изменения голосового состояния
    if (oldState.channelId !== newState.channelId) {
        console.log(`Пользователь ${newState.member.user.tag} переместился с канала ${oldState.channelId} на канал ${newState.channelId}.`);
    }
});

// Ваши дополнительные обработчики событий...

client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
    console.error('Ошибка при подключении бота:', error);
});

module.exports = client;
