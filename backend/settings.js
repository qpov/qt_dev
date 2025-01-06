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

// Получить настройки пользователя по его ID
function getUserSettings(userId) {
    console.log('Запрос настроек для пользователя:', userId);
    return settings.users ? settings.users[userId] : null;
}

// Установить настройки пользователя
function setUserSettings(userId, guildId, voiceChannelId) {
    if (!settings.users) {
        settings.users = {};
    }
    settings.users[userId] = { guildId, voiceChannelId };
    console.log('Устанавливаем настройки для пользователя:', userId, guildId, voiceChannelId);
    saveSettings();
}

// Проверка, управляется ли канал ботом
function isManagedChannel(channelId) {
    return settings.managedChannels && settings.managedChannels.includes(channelId);
}

// Добавить канал в список управляемых
function addManagedChannel(channelId) {
    if (!settings.managedChannels) {
        settings.managedChannels = [];
    }
    settings.managedChannels.push(channelId);
    saveSettings();
}

// Удалить канал из списка управляемых
function removeManagedChannel(channelId) {
    if (!settings.managedChannels) return;
    settings.managedChannels = settings.managedChannels.filter(id => id !== channelId);
    saveSettings();
}

module.exports = {
    getUserSettings,
    setUserSettings,
    isManagedChannel,
    addManagedChannel,
    removeManagedChannel,
};
