// backend/bot.js

const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
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

const createdChannels = new Map();

client.once('ready', () => {
    console.log(`Бот вошёл как ${client.user.tag}`);
    initializeChannels();
    watchSettingsFile();
});

function initializeChannels() {
    const allGuildSettings = settings.getAllGuildSettings();
    console.log('Инициализация настроек для гильдий:', allGuildSettings);
}

function watchSettingsFile() {
    const settingsFilePath = path.join(__dirname, 'settings.json');
    fs.watchFile(settingsFilePath, () => {
        console.log('Файл settings.json изменён. Обновляем настройки...');
    });
}

client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        if (newState.member.user.bot) return;

        const guildId = newState.guild.id;
        const guildSetting = settings.getGuildSettings(guildId);

        if (!guildSetting || !guildSetting.sourceVoiceChannelId) {
            console.log(`Нет настроек для гильдии ${guildId} или не указан исходный голосовой канал.`);
            return;
        }

        const sourceChannelId = guildSetting.sourceVoiceChannelId;

        if (newState.channelId === sourceChannelId && oldState.channelId !== sourceChannelId) {
            console.log(`Пользователь ${newState.member.user.tag} подключился к исходному каналу.`);

            const existingChannelId = Array.from(createdChannels.entries())
                .find(([channelId, uid]) => uid === newState.id)?.[0];

            if (existingChannelId) {
                const existingChannel = newState.guild.channels.cache.get(existingChannelId);
                if (existingChannel) {
                    console.log(`У пользователя уже есть канал ${existingChannel.name}. Перемещаем его туда.`);
                    await newState.setChannel(existingChannel);
                    return;
                } else {
                    console.log(`Канал для пользователя ${newState.member.user.tag} был удалён вручную.`);
                    createdChannels.delete(existingChannelId);
                }
            }

            const channelName = `${newState.member.user.username}'s Channel`;
            const newChannel = await createVoiceChannel(newState.guild, channelName, newState.channel.parentId);
            if (newChannel) {
                createdChannels.set(newChannel.id, newState.id);
                console.log(`Создан канал ${newChannel.name}. Перемещаем пользователя ${newState.member.user.tag}.`);
                await newState.setChannel(newChannel);
            }
        }

        if (oldState.channelId && createdChannels.has(oldState.channelId)) {
            const channel = oldState.guild.channels.cache.get(oldState.channelId);
            if (channel && channel.members.size === 0) {
                console.log(`Удаляем пустой канал ${channel.name}.`);
                await channel.delete();
                createdChannels.delete(oldState.channelId);
            }
        }
    } catch (error) {
        console.error('Ошибка в обработке voiceStateUpdate:', error);
    }
});

async function createVoiceChannel(guild, name, parentId) {
    try {
        return await guild.channels.create({
            name,
            type: ChannelType.GuildVoice,
            parent: parentId,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
                },
            ],
        });
    } catch (error) {
        console.error('Ошибка при создании голосового канала:', error);
        return null;
    }
}

client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
    console.error('Ошибка при подключении бота:', error);
});

module.exports = client;
