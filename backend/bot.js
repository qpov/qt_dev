// backend/bot.js
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
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

const createdChannels = new Map(); // Map для отслеживания созданных каналов (userId -> channelId)

client.once('ready', () => {
    console.log(`Бот вошёл как ${client.user.tag}`);
    initializeChannels();
    watchSettingsFile();
});

// Функция для инициализации каналов при запуске бота
function initializeChannels() {
    const usersSettings = settings.getAllUserSettings();
    if (typeof usersSettings !== 'object' || usersSettings === null) {
        console.error('getAllUserSettings() вернул некорректное значение:', usersSettings);
        return;
    }

    Object.entries(usersSettings).forEach(([userId, userSetting]) => {
        // Здесь мы не подключаемся к голосовым каналам, а просто отслеживаем настройки
        // Создание каналов будет происходить при подключении пользователя
    });
}

// Функция для отслеживания изменений в файле настроек
function watchSettingsFile() {
    const settingsFilePath = path.join(__dirname, 'settings.json');
    fs.watchFile(settingsFilePath, (curr, prev) => {
        console.log('Файл settings.json был изменён. Обновляем настройки...');
        // При изменении настроек мы можем обновить логику, если необходимо
    });
}

// Обработчик событий голосовых состояний
client.on('voiceStateUpdate', async (oldState, newState) => {
    // Игнорируем изменения статуса бота
    if (newState.member.user.bot) return;

    // Получаем ID пользователя и его тег
    const userId = newState.id;
    const userTag = newState.member.user.tag;

    // Получаем настройки пользователя
    const userSetting = settings.getUserSettings(userId);
    if (!userSetting) return; // Нет настроек для этого пользователя

    const { guildId, voiceChannelId } = userSetting;

    // Получаем гильдию
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.log(`Гильдия с ID ${guildId} не найдена.`);
        return;
    }

    // Проверяем, подключился ли пользователь к мониторимому голосовому каналу
    if (newState.channelId === voiceChannelId && oldState.channelId !== voiceChannelId) {
        // Проверяем, есть ли уже созданный канал для этого пользователя
        if (createdChannels.has(userId)) {
            const existingChannelId = createdChannels.get(userId);
            const existingChannel = guild.channels.cache.get(existingChannelId);
            if (existingChannel) {
                console.log(`У пользователя ${userTag} уже есть канал ${existingChannel.name}.`);
                // Перемещаем пользователя в существующий канал
                try {
                    await newState.setChannel(existingChannel);
                    console.log(`Пользователь ${userTag} перемещён в существующий канал ${existingChannel.name}.`);
                } catch (error) {
                    console.error(`Не удалось переместить пользователя ${userTag} в канал ${existingChannel.name}:`, error);
                }
                return;
            } else {
                // Канал был удалён вручную, удаляем из карты
                createdChannels.delete(userId);
            }
        }

        // Создаём новый голосовой канал с именем пользователя
        const channelName = userTag;
        try {
            const newChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                reason: `Создан канал для пользователя ${userTag}`,
                parent: newState.channel.parentId, // Устанавливаем ту же категорию, что и мониторимому каналу
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        allow: ['Connect', 'Speak'],
                    },
                    {
                        id: userId,
                        allow: ['Connect', 'Speak'],
                    },
                ],
            });
            console.log(`Создан голосовой канал ${newChannel.name} для пользователя ${userTag}.`);
            createdChannels.set(userId, newChannel.id);

            // Перемещаем пользователя в новый канал
            await newState.setChannel(newChannel);
            console.log(`Пользователь ${userTag} перемещён в канал ${newChannel.name}.`);
        } catch (error) {
            console.error(`Ошибка при создании или перемещении в канал для пользователя ${userTag}:`, error);
        }
    }

    // Проверяем, если пользователь покинул созданный канал, и там стало никого
    if (oldState.channelId && createdChannels.has(userId)) {
        const leftChannelId = oldState.channelId;
        const leftChannel = guild.channels.cache.get(leftChannelId);
        if (leftChannel && leftChannel.members.size === 0) {
            try {
                await leftChannel.delete(`Удаление пустого канала, созданного для пользователя ${userTag}`);
                console.log(`Канал ${leftChannel.name} удалён, так как он стал пустым.`);
                createdChannels.delete(userId);
            } catch (error) {
                console.error(`Не удалось удалить канал ${leftChannel.name}:`, error);
            }
        }
    }
});

// Запуск бота
client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
    console.error('Ошибка при подключении бота:', error);
});

module.exports = client;
