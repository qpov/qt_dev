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

const createdChannels = new Map(); // Map для отслеживания созданных каналов (channelId -> userId)

client.once('ready', () => {
    console.log(`Бот вошёл как ${client.user.tag}`);
    initializeChannels();
    watchSettingsFile();
});

// Функция для инициализации каналов при запуске бота
function initializeChannels() {
    const allGuildSettings = settings.getAllGuildSettings();
    for (const guildId in allGuildSettings) {
        const guildSetting = allGuildSettings[guildId];
        // Здесь мы не подключаемся к голосовым каналам, а просто отслеживаем настройки
        // Создание каналов будет происходить при подключении пользователя
    }
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

    const guildId = newState.guild.id;
    const guildSetting = settings.getGuildSettings(guildId);
    if (!guildSetting || !guildSetting.sourceVoiceChannelId) return; // Нет настроек для этой гильдии

    const sourceChannelId = guildSetting.sourceVoiceChannelId;

    // Получаем ID пользователя и его тег
    const userId = newState.id;
    const userTag = newState.member.user.tag;

    // Проверяем, разрешено ли этому пользователю создавать каналы
    const guildUsers = settings.getGuildUsers(guildId);
    if (!guildUsers[userId]) return; // Пользователь не имеет разрешения

    // Проверяем, подключился ли пользователь к исходному голосовому каналу
    if (newState.channelId === sourceChannelId && oldState.channelId !== sourceChannelId) {
        // Проверяем, есть ли уже созданный канал для этого пользователя
        const existingChannelId = Array.from(createdChannels.entries())
            .find(([channelId, uid]) => uid === userId)?.[0];

        if (existingChannelId) {
            const existingChannel = newState.guild.channels.cache.get(existingChannelId);
            if (existingChannel) {
                console.log(`У пользователя ${userTag} уже есть канал ${existingChannel.name}. Перемещаем его туда.`);
                try {
                    await newState.setChannel(existingChannel);
                    console.log(`Пользователь ${userTag} перемещён в канал ${existingChannel.name}.`);
                } catch (error) {
                    console.error(`Не удалось переместить пользователя ${userTag} в канал ${existingChannel.name}:`, error);
                }
                return;
            } else {
                // Канал был удалён вручную, удаляем из карты
                createdChannels.delete(existingChannelId);
            }
        }

        // Создаём новый голосовой канал с именем пользователя
        const channelName = userTag;
        try {
            const newChannel = await newState.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                reason: `Создан канал для пользователя ${userTag}`,
                parent: newState.channel.parentId, // Устанавливаем ту же категорию, что и исходному каналу
                permissionOverwrites: [
                    {
                        id: newState.guild.roles.everyone.id,
                        allow: ['Connect', 'Speak'],
                        // Удалили deny: ['ViewChannel'], чтобы не скрывать канал
                    },
                    {
                        id: userId,
                        allow: ['Connect', 'Speak'],
                    },
                ],
            });
            console.log(`Создан голосовой канал ${newChannel.name} для пользователя ${userTag}.`);
            createdChannels.set(newChannel.id, userId);

            // Перемещаем пользователя в новый канал
            await newState.setChannel(newChannel);
            console.log(`Пользователь ${userTag} перемещён в канал ${newChannel.name}.`);
        } catch (error) {
            console.error(`Ошибка при создании или перемещении в канал для пользователя ${userTag}:`, error);
        }
    }

    // Проверяем, если пользователь покинул созданный канал, и там стало никого
    if (oldState.channelId && createdChannels.has(oldState.channelId)) {
        const leftChannelId = oldState.channelId;
        const leftChannel = newState.guild.channels.cache.get(leftChannelId);
        if (leftChannel && leftChannel.members.size === 0) {
            try {
                await leftChannel.delete(`Удаление пустого канала, созданного для пользователя ${userTag}`);
                console.log(`Канал ${leftChannel.name} удалён, так как он стал пустым.`);
                createdChannels.delete(leftChannelId);
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
