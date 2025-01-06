const fs = require('fs');
const path = require('path');

const settingsFile = path.join(__dirname, 'settings.json');

let settings = { guilds: {} }; // Инициализация с базовой структурой

// Загрузка настроек из файла
if (fs.existsSync(settingsFile)) {
    try {
        const data = fs.readFileSync(settingsFile, 'utf-8');
        settings = JSON.parse(data);
        console.log('Настройки загружены из settings.json');
    } catch (error) {
        console.error('Ошибка при чтении settings.json:', error);
    }
} else {
    console.error('Файл settings.json не найден. Создаём новый с базовой структурой.');
    saveSettings();
}

// Функция для сохранения настроек в файл
function saveSettings() {
    try {
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        console.log('Настройки успешно сохранены в settings.json');
    } catch (error) {
        console.error('Ошибка при записи settings.json:', error);
    }
}

// Получить настройки пользователя по его ID
function getUserSettings(userId) {
    console.log('Запрос настроек для пользователя:', userId);
    const guilds = Object.values(settings.guilds || {});
    for (const guild of guilds) {
        if (guild.users && guild.users[userId]) {
            return { guildId: guild.guildId, voiceChannelId: guild.users[userId].voiceChannelId };
        }
    }
    console.error(`Настройки для пользователя ${userId} не найдены.`);
    return null;
}

// Получить все настройки пользователей
function getAllUserSettings() {
    console.log('Получение всех настроек пользователей');
    return settings.guilds || {};
}

// Установить настройки пользователя
function setUserSettings(userId, guildId, voiceChannelId) {
    console.log('Установка настроек:', { userId, guildId, voiceChannelId });

    if (!settings.guilds[guildId]) {
        settings.guilds[guildId] = {
            sourceVoiceChannelId: null,
            users: {}
        };
    }
    settings.guilds[guildId].users[userId] = { voiceChannelId };
    saveSettings();
}

// Получить настройки гильдии
function getGuildSettings(guildId) {
    console.log('Запрос настроек для гильдии:', guildId);
    return settings.guilds[guildId] || { sourceVoiceChannelId: null, users: {} };
}

// Установить исходный голосовой канал для гильдии
function setSourceVoiceChannel(guildId, channelId) {
    console.log(`Установка исходного голосового канала для гильдии ${guildId}: ${channelId}`);
    if (!settings.guilds[guildId]) {
        settings.guilds[guildId] = {
            sourceVoiceChannelId: channelId,
            users: {}
        };
    } else {
        settings.guilds[guildId].sourceVoiceChannelId = channelId;
    }
    saveSettings();
}

module.exports = {
    getUserSettings,
    getAllUserSettings,
    setUserSettings,
    getGuildSettings,
    setSourceVoiceChannel,
    saveSettings
};
