// backend/settings.js

const fs = require('fs');
const path = require('path');

const settingsFile = path.join(__dirname, 'settings.json');

let settings = {};

if (fs.existsSync(settingsFile)) {
    try {
        const data = fs.readFileSync(settingsFile, 'utf-8');
        settings = JSON.parse(data);
        console.log('Настройки загружены из settings.json');
    } catch (error) {
        console.error('Ошибка при чтении settings.json:', error);
    }
} else {
    console.error('Файл settings.json не найден. Проверьте наличие файла.');
}

function saveSettings() {
    try {
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        console.log('Настройки успешно сохранены в settings.json');
    } catch (error) {
        console.error('Ошибка при записи settings.json:', error);
    }
}

function getUserSettings(userId) {
    console.log('Запрос настроек для пользователя:', userId);
    for (const guildId in settings.guilds) {
        const guild = settings.guilds[guildId];
        if (guild.users && guild.users[userId]) {
            return {
                guildId: guildId,
                ...guild.users[userId],
            };
        }
    }
    console.error(`Настройки для пользователя ${userId} не найдены.`);
    return null;
}

function getAllUserSettings() {
    console.log('Получение всех настроек пользователей');
    return settings.guilds || {};
}

function getAllGuildSettings() {
    console.log('Получение всех настроек гильдий');
    return settings.guilds || {};
}

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

function getGuildSettings(guildId) {
    console.log('Запрос настроек для гильдии:', guildId);
    return settings.guilds ? settings.guilds[guildId] : null;
}

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
    getAllGuildSettings,
    setUserSettings,
    getGuildSettings,
    setSourceVoiceChannel,
    saveSettings
};
