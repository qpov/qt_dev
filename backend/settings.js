// backend/settings.js
const fs = require('fs');
const path = require('path');

const settingsFile = path.join(__dirname, 'settings.json');

let settings = {};

// Загрузка настроек из файла, если он существует
if (fs.existsSync(settingsFile)) {
    try {
        const data = fs.readFileSync(settingsFile, 'utf-8');
        settings = JSON.parse(data);
        console.log('Настройки загружены из settings.json');
    } catch (error) {
        console.error('Ошибка при чтении settings.json:', error);
    }
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

// Получить настройки гильдии
function getGuildSettings(guildId) {
    return settings.guilds ? settings.guilds[guildId] : null;
}

// Получить все настройки гильдий
function getAllGuildSettings() {
    return settings.guilds ? settings.guilds : {};
}

// Добавить пользователя в настройки гильдии
function addUserToGuild(guildId, userId) {
    if (!settings.guilds[guildId]) {
        settings.guilds[guildId] = {
            sourceVoiceChannelId: null,
            users: {}
        };
    }
    settings.guilds[guildId].users[userId] = {};
    saveSettings();
}

// Установить исходный голосовой канал для гильдии
function setSourceVoiceChannel(guildId, channelId) {
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

// Получить список пользователей для гильдии
function getGuildUsers(guildId) {
    return settings.guilds && settings.guilds[guildId] ? settings.guilds[guildId].users : {};
}

module.exports = {
    getGuildSettings,
    getAllGuildSettings,
    addUserToGuild,
    setSourceVoiceChannel,
    getGuildUsers,
};
